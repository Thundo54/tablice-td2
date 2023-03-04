import { capitalizeFirstLetter, splitRoute } from './utils.js';

// export function parseTimetable(station, isDeparture = true) {
//     let trainSet = [], train = {}, stopList = [];
//     let data = window.timetablesAsJson;
//     if (data === null) { return; }
//     for (let i in data) {
//         if (data[i]['timetable'] === undefined) { continue; }
//         for (let j in data[i]['timetable']['stopList']) {
//             if (data[i]['timetable']['stopList'][j]['stopType'].includes('ph')) {
//                 stopList.push(capitalizeFirstLetter(data[i]['timetable']['stopList'][j]['stopNameRAW'].split(',')[0]));
//             }
//             if (capitalizeFirstLetter(data[i]['timetable']['stopList'][j]['stopNameRAW']) === capitalizeFirstLetter(station)) {
//                 if (!data[i]['timetable']['stopList'][j]['terminatesHere']
//                     && !data[i]['timetable']['stopList'][j]['beginsHere']) {
//                     if (!data[i]['timetable']['stopList'][j]['stopType'].includes('ph')) {
//                         continue;
//                     }
//                 }
//                 if (data[i]['timetable']['stopList'][j]['confirmed']) { continue; }
//                 if (isDeparture && !data[i]['timetable']['stopList'][j]['terminatesHere']) {
//                     train['beginsTerminatesHere'] = data[i]['timetable']['stopList'][j]['beginsHere'];
//                     train['timestamp'] = data[i]['timetable']['stopList'][j]['departureTimestamp'];
//                     train['delay'] = data[i]['timetable']['stopList'][j]['departureDelay'];
//                     train['stationFromTo'] = splitRoute(data[i]['timetable']['route'])[1];
//                 } else if (!isDeparture && !data[i]['timetable']['stopList'][j]['beginsHere']) {
//                     train['beginsTerminatesHere'] = data[i]['timetable']['stopList'][j]['terminatesHere'];
//                     train['timestamp'] = data[i]['timetable']['stopList'][j]['arrivalTimestamp'];
//                     train['delay'] = data[i]['timetable']['stopList'][j]['arrivalDelay'];
//                     train['stationFromTo'] = splitRoute(data[i]['timetable']['route'])[0];
//                 }
//                 train['stoppedHere'] = data[i]['timetable']['stopList'][j]['stopped'];
//             }
//         }
//
//         if (!data[i]['timetable']['category'].match(/^[LTZ]/) && train['timestamp'] !== undefined) {
//             if (isDeparture) {
//                 train['timetable'] = stopList.slice(stopList.indexOf(station) + 1);
//             } else {
//                 train['timetable'] = stopList.slice(0, stopList.indexOf(station));
//             }
//             train['category'] = data[i]['timetable']['category'];
//             train['trainNo'] = data[i]['trainNo'];
//             trainSet.push(train);
//             //console.log(train);
//         }
//         stopList = [];
//         train = {};
//     }
//
//     window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
//     return trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
// }


export function parseTimetable() {
    let trainSet = [], train = {}, stopList = [];
    if (window.timetablesAsJson === null) { return; }
    window.timetablesAsJson.forEach((timetable) => {
        if (timetable['timetable'] === undefined) { return; }
        timetable['timetable']['stopList'].forEach((stopPoint) => {
            if (stopPoint['stopType'].includes('ph')) {
                stopList.push(capitalizeFirstLetter(stopPoint['stopNameRAW'].split(',')[0]));
            }
            if (capitalizeFirstLetter(stopPoint['stopNameRAW']) === capitalizeFirstLetter(station)) {
                if (!stopPoint['terminatesHere'] && !stopPoint['beginsHere']) {
                     if (!stopPoint['stopType'].includes('ph')) { return; }
                }
                if (stopPoint['confirmed']) { return; }
                train['stoppedHere'] = stopPoint['stopped'];
                if (isDeparture && !stopPoint['terminatesHere']) {
                    train['beginsTerminatesHere'] = stopPoint['beginsHere'];
                    train['timestamp'] = stopPoint['departureTimestamp'];
                    train['delay'] = stopPoint['departureDelay'];
                    train['stationFromTo'] = splitRoute(timetable['timetable']['route'])[1];
                } else if (!isDeparture && !stopPoint['beginsHere']) {
                    train['beginsTerminatesHere'] = stopPoint['terminatesHere'];
                    train['timestamp'] = stopPoint['arrivalTimestamp'];
                    train['delay'] = stopPoint['arrivalDelay'];
                    train['stationFromTo'] = splitRoute(timetable['timetable']['route'])[0];
                }
            }
        });

        if (timetable['timetable']['category'].match(/^[LTZ]/) && train['timestamp'] !== undefined) {
            if (isDeparture) {
                train['timetable'] = stopList.slice(stopList.indexOf(station) + 1);
            } else {
                train['timetable'] = stopList.slice(0, stopList.indexOf(station));
            }
            train['category'] = timetable['timetable']['category'];
            train['trainNo'] = timetable['trainNo'];
            trainSet.push(train);
        }

        stopList = [];
        train = {};
    });

    window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
    return trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
}

function generateStationsList() {
    let stationsData = window.stationDataAsJson;
    let stationsSet = [], station = {};
    stationsData.forEach((stationData) => {
        if (stationData['availability'] === 'abandoned') { return; }
        if (stationData['availability'] === 'unavailable') { return; }

        station['name'] = stationData['name'];
        station['isActive'] = false;

        if (stationData['checkpoints'] === null || stationData['checkpoints'] === '') {
            station['nameApi'] = station['name'];
            station['checkpoints'] = station['name'];
        } else {
            station['nameApi'] = stationData['checkpoints'].split(';')[0];
            station['checkpoints'] = stationData['checkpoints'];
        }

        stationsSet.push(station);
        station = {};
    });

    window.stationsSet = stationsSet.sort((a, b) => { return a.name.localeCompare(b.name) });
    refreshSceneriesList();
}

export function refreshSceneriesList() {
    let activeSceneries = $('#active-sceneries');
    let otherSceneries = $('#other-sceneries');
    let sceneries = $('#sceneries');
    let selectedOption = sceneries.val();
    activeSceneries.empty();
    otherSceneries.empty();

    window.stationsSet.forEach((station) => {
        station['isActive'] = false;
        
        window.activeStationsAsJson.forEach((activeStation) => {
            if (activeStation['region'] !== "eu") { return; }
            if (!activeStation['isOnline']) { return; }
            if (activeStation['stationName'] === station['name']) {
                station['isActive'] = true;
            }
        });

        if (station['isActive']) {
            activeSceneries.append($('<option>', {
                text: station['name'],
            }));
        } else {
            otherSceneries.append($('<option>', {
                text: station['name']
            }));
        }
    });

    sceneries.val(selectedOption);
}

export function refreshCheckpointsList() {
    let checkpoints = $('#checkpoints');
    checkpoints.empty();

    window.stationsSet.forEach((station) => {
        if (station['name'] === $('#sceneries').val()) {
            station['checkpoints'].split(';').forEach((checkpoint) => {
                if (checkpoint === station['nameApi']) {
                    checkpoints.append($('<option>', {
                        value: checkpoint.replace('LCS ', ''),
                        text: station['name'].replace('LCS ', '')
                    }));
                } else {
                    checkpoints.append($('<option>', {
                        value: checkpoint.replace('LCS ', ''),
                        text: checkpoint.replace('LCS ', '')
                    }));
                }
            });
        }
    });
}

export function getTimetables() {
    $.ajax({
        //url: 'https://spythere.pl/api/getActiveTrainList',
        dataType: 'json',
        url: 'https://gist.githubusercontent.com/Thundo54/bba89c9eba39921844eec0013c9c1c40/raw/96b70b491f68d7400b5ac11fce8d54f226f4047c/gistfile1.txt',
        //url: 'https://gist.githubusercontent.com/Thundo54/8f66268e1b36bdf92b40f26e50f652dc/raw/090f14935868e814ff071363b6b90ca0fb7849f6/gistfile1.txt',
        success: [
            (response) => {
                window.timetablesAsJson = response;
            }
        ]
    });
}

export function getStationsData() {
    $.ajax({
        url: 'https://spythere.pl/api/getSceneries',
        dataType: 'json',
        success: [
            (response) => {
                window.stationDataAsJson = response;
                generateStationsList();
            }
        ]
    });
}

export function getActiveStations() {
    $.ajax({
        url: 'https://api.td2.info.pl/?method=getStationsOnline',
        dataType: 'json',
        success: [
            (response) => {
                window.activeStationsAsJson = response['message'];
            }
        ]
    });
}



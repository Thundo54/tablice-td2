import * as utils from './utils.js';

export function parseTimetable() {
    let trainSet = [], train = {}, stopList = [];
    if (timetablesAsJson === null) { return; }
    if (station === '') { return; }
    let stationSwitch = !isDeparture;
    timetablesAsJson.forEach((timetable) => {
        if (timetable['timetable'] === undefined) { return; }
        timetable['timetable']['stopList'].forEach((stopPoint) => {
            if (station.toUpperCase() === stopPoint['stopNameRAW'].toUpperCase()) {
                stationSwitch = !stationSwitch;
                if (stopPoint['confirmed']) { return; }
                train = utils.createTrainData(stopPoint, timetable, isDeparture);
            }
            if (stopTypes.some(stop => stopPoint['stopType'].includes(stop.replace('all', ''))) && stationSwitch) {
                if (!stopPoint['stopNameRAW'].toUpperCase().includes('SBL')) {
                    stopList.push(utils.capitalizeFirstLetter(stopPoint['stopNameRAW'].split(',')[0]));
                }
            }
        });

        stopList = stopList.filter(stop => stop !== train.stationFromTo);
        stopList = stopList.filter(stop => stop !== utils.capitalizeFirstLetter(station));
        stopList = stopList.filter((stop, index) => stopList.indexOf(stop) >= index);
        train.timetable = stopList;

        if (train.timestamp !== undefined) {
            if (train.category.match(new RegExp(`\\b[${trainTypes.join('')}]`))) { trainSet.push(train); }
        }
        stopList = [];
        train = {};
        stationSwitch = !isDeparture;
    });

    window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
    return trainsSetBefore;
}

function generateStationsList() {
    let stationsSet = [], station = {};
    stationDataAsJson.forEach((stationData) => {
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

    stationsSet.forEach((station) => {
        station['isActive'] = false;
        
        activeStationsAsJson.forEach((activeStation) => {
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

    stationsSet.forEach((station) => {
        if (station['name'] === $('#sceneries').val()) {
            station['checkpoints'].split(';').forEach((checkpoint) => {
                checkpoints.append($('<option>', {
                    value: checkpoint,
                    text: utils.capitalizeFirstLetter(checkpoint)
                }));
            });
        }
    });
}

export function getTimetables() {
    $.ajax({
        url: 'https://spythere.pl/api/getActiveTrainList',
        dataType: 'json',
        //url: 'https://gist.githubusercontent.com/Thundo54/bba89c9eba39921844eec0013c9c1c40/raw/96b70b491f68d7400b5ac11fce8d54f226f4047c/gistfile1.txt',
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



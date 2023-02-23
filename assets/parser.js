import { capitalizeFirstLetter, splitRoute } from './utils.js';

export function parseTimetable(station, isDeparture = true) {
    let trainSet = [], train = {}, stopList = [];
    let data = window.dataAsJson;
    if (data === null) { return; }
    for (let i in data) {
        if (data[i]['timetable'] === undefined) { continue; }
        for (let j in data[i]['timetable']['stopList']) {
            if (data[i]['timetable']['stopList'][j]['stopType'].includes('ph')) {
                stopList.push(capitalizeFirstLetter(data[i]['timetable']['stopList'][j]['stopNameRAW'].split(',')[0]));
            }
            if (capitalizeFirstLetter(data[i]['timetable']['stopList'][j]['stopNameRAW']) === station) {
                if (!data[i]['timetable']['stopList'][j]['terminatesHere']
                    && !data[i]['timetable']['stopList'][j]['beginsHere']) {
                    if (!data[i]['timetable']['stopList'][j]['stopType'].includes('ph')) {
                        continue;
                    }
                }
                if (data[i]['timetable']['stopList'][j]['confirmed']) { continue; }
                if (isDeparture && !data[i]['timetable']['stopList'][j]['terminatesHere']) {
                    train['beginsTerminatesHere'] = data[i]['timetable']['stopList'][j]['beginsHere'];
                    train['timestamp'] = data[i]['timetable']['stopList'][j]['departureTimestamp'];
                    train['delay'] = data[i]['timetable']['stopList'][j]['departureDelay'];
                    train['stationFromTo'] = splitRoute(data[i]['timetable']['route'])[1];
                } else if (!isDeparture && !data[i]['timetable']['stopList'][j]['beginsHere']) {
                    train['beginsTerminatesHere'] = data[i]['timetable']['stopList'][j]['terminatesHere'];
                    train['timestamp'] = data[i]['timetable']['stopList'][j]['arrivalTimestamp'];
                    train['delay'] = data[i]['timetable']['stopList'][j]['arrivalDelay'];
                    train['stationFromTo'] = splitRoute(data[i]['timetable']['route'])[0];
                }
                train['stoppedHere'] = data[i]['timetable']['stopList'][j]['stopped'];
            }
        }

        if (!data[i]['timetable']['category'].match(/^[LTZ]/) && train['timestamp'] !== undefined) {
            if (isDeparture) {
                train['timetable'] = stopList.slice(stopList.indexOf(station) + 1);
            } else {
                train['timetable'] = stopList.slice(0, stopList.indexOf(station));
            }
            train['category'] = data[i]['timetable']['category'];
            train['trainNo'] = data[i]['trainNo'];
            trainSet.push(train);
            //console.log(train);
        }
        stopList = [];
        train = {};
    }

    window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
    return trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
}

export function getTimetables() {
    $.ajax({
        url: 'https://spythere.pl/api/getActiveTrainList',
        dataType: 'json',
        //url: 'https://gist.githubusercontent.com/Thundo54/bba89c9eba39921844eec0013c9c1c40/raw/96b70b491f68d7400b5ac11fce8d54f226f4047c/gistfile1.txt',
        //url: 'https://gist.githubusercontent.com/Thundo54/8f66268e1b36bdf92b40f26e50f652dc/raw/090f14935868e814ff071363b6b90ca0fb7849f6/gistfile1.txt',
        success: (response) => {
            window.dataAsJson = response;
        }
    });
}



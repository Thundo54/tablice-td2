import * as utils from './utils.js';

export function parseTimetable() {
    let trainSet = [], train = {}, stopList = [], stopListElement = {};
    if (timetablesAsJson === null) { return; }
    if (station === '') { return; }
    let stationSwitch = !isDeparture;
    timetablesAsJson.forEach((timetable) => {
        if (timetable.timetable === undefined) { return; }
        if (timetable.region !== region) { return; }
        timetable['timetable']['stopList'].forEach((stopPoint) => {
            if (stopPoint['stopTime'] === null) { stopPoint['stopTime'] = 0; }
            if (stopPoint['stopTime'] > 0 && stopPoint['stopType'] === '') { stopPoint['stopType'] = 'pt'; }
            if (station.toUpperCase() === stopPoint['stopNameRAW'].toUpperCase()) {
                stationSwitch = !stationSwitch;
                if (stopPoint['confirmed']) { return; }
                if (isStopped && !(stopPoint['beginsHere'] || stopPoint['terminatesHere'])) {
                    if (stopPoint['stopType'] === '') {
                        return;
                    }
                }
                train = utils.createTrainData(stopPoint, timetable);
            }
            if (stopTypes.some(stop => stopPoint['stopType'].includes(stop.replace('all', ''))) && stationSwitch) {
                if (!stopPoint['stopNameRAW'].toUpperCase().includes('SBL')) {
                    stopListElement.stopPoint = utils.capitalizeFirstLetter(stopPoint['stopNameRAW'].split(',')[0]);
                    stopListElement.arrivalAt = utils.convertTime(stopPoint['arrivalTimestamp']);
                    stopListElement.departureAt = utils.convertTime(stopPoint['departureTimestamp']);
                    if (stopPoint['stopType'].includes('pm')) {
                        stopListElement.stopPoint = `${stopListElement.stopPoint}`;
                        stopListElement.isShunting = true;
                    }
                    stopList.push(stopListElement);
                }
            }

            stopListElement = {};
        });

        stopList = stopList.filter(stop => stop.stopPoint !== train.stationFromTo);
        stopList = stopList.filter(stop => stop.stopPoint !== utils.capitalizeFirstLetter(station).split(',')[0]);
        stopList = stopList.filter((stop, index) => stopList.indexOf(stop) >= index);
        train.timetable = stopList;

        if (train.timestamp !== undefined) {
            if (train.gameCategory.match(new RegExp(`\\b[${trainTypes.join('')}]`))) {
                trainCategory.forEach((category) => {
                    if (showOperators) {
                        train = utils.convertOperator(train);
                    }
                    if (train.gameCategory.includes(category)) {
                        trainSet.push(train);
                    }
                });
            }
        }

        stopList = [];
        train = {};
        stationSwitch = !isDeparture;
    });

    if (showHistory) {
        if (dateFrom === new Date().toISOString().split('T')[0]) {
            let historicalData = parseHistoricalTimetable();
            historicalData.forEach((train) => {
                if (!trainSet.some((trainSetTrain) => trainSetTrain.timetableId === train.timetableId)) {
                    trainSet.push(train);
                }
            });
        } else {
            trainSet = parseHistoricalTimetable();
        }
    }

    window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
    return trainsSetBefore;
}

export function parseHistoricalTimetable() {
    let trainSet = [], train = {}, stopList = [], stopListElement = {};
    let stopPoint = {};
    let stationSwitch = !isDeparture;
    oldTimetablesAsJson.forEach((timetable) => {
        if (region !== 'eu') { return; }
        timetable['sceneriesString'].split('%').forEach((scenery, index) => {
            stopPoint.stopName = scenery;
            stopPoint.arrivalDelay = 0;
            stopPoint.departureDelay = 0;
            stopPoint.stopTime = parseInt(timetable['checkpointStopTypes'][index].split(',')[0]);
            stopPoint.stopType = timetable['checkpointStopTypes'][index].split(',')[1];
            stopPoint.arrivalTimestamp = new Date(timetable['checkpointArrivalsScheduled'][index]).getTime();
            stopPoint.departureTimestamp = new Date(timetable['checkpointDeparturesScheduled'][index]).getTime();
            stopPoint.beginsHere = timetable['route'].split('|')[0].toUpperCase() === station.toUpperCase();
            stopPoint.terminatesHere = timetable['route'].split('|')[1].toUpperCase() === station.toUpperCase();
            if (isNaN(stopPoint['stopTime'])) { stopPoint['stopTime'] = 0; }
            if (stopPoint['stopTime'] > 0 && stopPoint['stopType'] === '') { stopPoint['stopType'] = 'pt'; }
            if (station.toUpperCase() === scenery.toUpperCase()) {
                stationSwitch = !stationSwitch;
                if (isStopped && !(timetable['route'].split('|').includes(scenery))) {
                    if (stopPoint['stopType'] === '') {
                        return;
                    }
                }

                train = utils.createTrainData(stopPoint, timetable, true);
            }
            if (stopTypes.some(stop => stopPoint['stopType'].includes(stop.replace('all', ''))) && stationSwitch) {
                    stopListElement.stopPoint = utils.capitalizeFirstLetter(stopPoint['stopName'].split(',')[0]);
                    stopListElement.arrivalAt = utils.convertTime(stopPoint['arrivalTimestamp']);
                    stopListElement.departureAt = utils.convertTime(stopPoint['departureTimestamp']);
                    if (stopPoint['stopType'].includes('pm')) {
                        stopListElement.stopPoint = `${stopListElement.stopPoint}`;
                        stopListElement.isShunting = true;
                    }
                    stopList.push(stopListElement);
            }

            stopPoint = {};
            stopListElement = {};
        });

        stopList = stopList.filter(stop => stop.stopPoint !== train.stationFromTo);
        stopList = stopList.filter(stop => stop.stopPoint !== utils.capitalizeFirstLetter(station).split(',')[0]);
        stopList = stopList.filter((stop, index) => stopList.indexOf(stop) >= index);
        train.timetable = stopList;

        if (train.timestamp !== undefined) {
            if (train.gameCategory.match(new RegExp(`\\b[${trainTypes.join('')}]`))) {
                trainCategory.forEach((category) => {
                    if (showOperators) {
                        train = utils.convertOperator(train);
                    }
                    if (train.gameCategory.includes(category)) {
                        if (timetable['fulfilled'] && timetable['terminated'] && isTerminated) {
                            trainSet.push(train);
                        }
                        if (!timetable['fulfilled'] && timetable['terminated'] && isFulfilled) {
                            trainSet.push(train);
                        }
                        if (!timetable['fulfilled'] && !timetable['terminated']) {
                            trainSet.push(train);
                        }
                    }
                });
            }
        }

        stopList = [];
        train = {};
        stationSwitch = !isDeparture;
    });

    return trainSet;
}

export function generateStationsList() {
    let stationsSet = [], station = {};
    stationDataAsJson.forEach((stationData) => {
        station.name = stationData['sceneryName'];
        station.mainCheckpoint = stationData['mainCheckpoint'];
        station.mainCheckpointSuffix = stationData['mainCheckpointSuffix'];
        station.isActive = false;
        station.points = stationData['checkpoints'];

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
        station.isActive = false;

        activeStationsAsJson['message'].forEach((activeStation) => {
            if (activeStation['region'] !== region) { return; }
            if (!activeStation['isOnline']) { return; }
            if (activeStation['stationName'] === station.name) {
                station.isActive = true;
            }
        });

        if (station.isActive) {
            activeSceneries.append($('<option>', {
                text: station.name,
                value: station.name
            }));
        } else {
            otherSceneries.append($('<option>', {
                text: station.name,
                value: station.name
            }));
        }
    });

    sceneries.val(selectedOption);
}

export function refreshCheckpointsList() {
    let checkpoints = $('#checkpoints');
    checkpoints.empty();

    stationsSet.forEach((station) => {
        if (station.name === $('#sceneries').val()) {
            if (!station.mainCheckpointSuffix) {
                station.mainCheckpointSuffix = '';
            }
            checkpoints.append($('<option>', {
                text: utils.capitalizeFirstLetter(station.mainCheckpoint)+station.mainCheckpointSuffix,
                value: station.mainCheckpoint+station.mainCheckpointSuffix
            }));
            station.points.forEach((checkpoint) => {
                if (!checkpoint.suffix) {
                    checkpoint.suffix = '';
                }
                checkpoints.append($('<option>', {
                    text: utils.capitalizeFirstLetter(checkpoint.name)+checkpoint.suffix,
                    value: checkpoint.name+checkpoint.suffix
                }));
            });
        }
    })
}

export function selectCheckpoint() {
    if (urlParams.get('station') !== null) {
        $('#sceneries').val(urlParams.get('station').replace('_', ' '));
        refreshCheckpointsList();
        if (urlParams.get('checkpoint') !== null) {
            let checkpoint = urlParams.get('checkpoint').replace('_', ' ');
            if (checkpoint.includes(',') && !checkpoint.split(',')[1].includes('.')) {
                checkpoint += '.';
            }
            if (checkpoint.includes('MAZ') && !checkpoint.split('MAZ')[1].includes('.')) { //temporary for TOMASZÓW & GRODZISK
                checkpoint += '.';
            }
            $('#checkpoints').val(checkpoint);
        }
    }
}

export function makeAjaxRequest(url, variableName) {
    return new Promise((resolve) => {
        $.ajax({
            url: url,
            dataType: 'json',
            success: (response) => {
                window[variableName] = response;
                resolve();
            }
        });
    });
}


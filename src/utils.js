import * as parser from "./parser.js";
import {loadTimetables} from "./timetables.js";

function correctNames(name) {
    for (let key in namesCorrectionsAsJson) {
        if (name.includes(key)) {
            return name.replace(key, namesCorrectionsAsJson[key]);
        }
    }
    return name;
}

function getMostCommon(array) {
    let counts = {};
    array.forEach((element) => {
        counts[element] = (counts[element] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

export function capitalizeFirstLetter(string) {
    if (string === string.toUpperCase()) {
        let output = '';
        string.split(' ').forEach((element) => {
            output += element.charAt(0).toUpperCase() + element.slice(1).toLowerCase() + ' '
        });
        return correctNames(output.slice(0, -1));
    } else {
        return correctNames(string);
    }
}

export function splitRoute(string) {
    let stations = [];
    string.split('|').forEach((element) => {
        stations.push(capitalizeFirstLetter(element));
    });
    return stations;
}

export function createTrainData(stopPoint, timetable) {
    let train = {};
    if (isDeparture && !stopPoint['terminatesHere']) {
        train.beginsTerminatesHere = stopPoint['beginsHere'];
        train.timestamp = stopPoint['departureTimestamp'];
        train.delay = stopPoint['departureDelay'];
        train.stationFromTo = splitRoute(timetable['timetable']['route'])[1];
    } else if (!isDeparture && !stopPoint['beginsHere']) {
        train.beginsTerminatesHere = stopPoint['terminatesHere'];
        train.timestamp = stopPoint['arrivalTimestamp'];
        train.delay = stopPoint['arrivalDelay'];
        train.stationFromTo = splitRoute(timetable['timetable']['route'])[0];
    }

    train.stoppedHere = stopPoint['stopped'];
    train.stopTime = stopPoint['stopTime'];
    train.trainNo = timetable['trainNo'];
    train.trainCars = timetable['stockString'];
    train.gameCategory = timetable['timetable']['category'];
    train.category = train.gameCategory;
    train.operator = train.gameCategory;
    train.trainName = '';

    return train;
}

export function createRemark(delay = 0, beginsTerminatesHere, isStopped) {
    // Można dodać przełącznik, który będzie pokazywał opóźnienie, jeśli pociąg kończy bieg
    if (delay > 0) {
        if (isStopped) {
            return `Pociąg został zatrzymany na trasie/train has been stopped on route/Der Zug wurde auf der Strecke angehalten`;
        } else {
            return `Opóźniony ${delay}min/delayed ${delay}min/Verspätung ${delay}min`;
        }
    } else if (beginsTerminatesHere) {
        if (isDeparture) {
            return 'Pociąg rozpoczyna bieg/train begins here/Zug beginnt hier';
        } else {
            return 'Pociąg kończy bieg/train terminates here/Zug endet hier';
        }
    } else {
        return '';
    }

    // if (beginsTerminatesHere && !isDeparture) {
    //     return 'Pociąg kończy bieg/train terminates here/zug endet hier';
    // }
    // if (delay > 0) {
    //     return `Opóźniony ${delay}min/delayed ${delay}min/verspätung ${delay}min`;
    // } else if (beginsTerminatesHere && isDeparture) {
    //     return 'Pociąg rozpoczyna bieg/train begins here/zug beginnt hier';
    // } else {
    //     return '';
    // }
}

export function addRow(time, trainNo, stationFromTo, via, operator, category, platform, remarks, rowNo) {
    let row = $('<tr>').attr('id', `${rowNo}`);
    if (overlayName === 'tomaszow') {
        row.append($('<td>').text(convertTime(time)));
        row.append($('<td>').append($('<div>').append($('<span>').text(createTrainString(category, trainNo)))));
        row.append($('<td>').append($('<span>').text(stationFromTo)));
        row.append($('<td>').append($('<span>').text(via)));
        row.append($('<td>').text(operator));
        row.append($('<td>').text(platform));
        row.append($('<td>').append($('<span>').text(remarks)));
    } else {
        row.append($('<td>')
            .append($('<p>').text(convertTime(time)))
            .append($('<div>').addClass('indented')
                .append($('<span>').text(createTrainString(category, trainNo)))
            )
        );
        row.append($('<td>').text(operator));
        row.append($('<td>')
            .append($('<div>')
                .append($('<span>').text(stationFromTo))
            )
            .append($('<div>').addClass('indented')
                .append($('<span>'))
            )
        );
        row.append($('<td>').append($('<span>')));
        row.append($('<td>').text(platform));
    }
    return row;
}

export function refreshIds() {
    let i = 0;
    $('#timetables table tr').each(function () {
        $(this).attr('id', i);
        i++;
    });
}

export function convertTime(time) {
    return new Date(time).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'});
}

export function createTrainString(category, trainNo) {
    return category + ' ' + trainNo;
}

export function resizeTimetableRow() {
    if (timetableRows !== null) {
        $('#timetables table tr').css('height', $('#timetables').height() / timetableRows);
    }
}

export function convertOperator(train) {
    let operatorProb = [];
    train.category = '';
    train.trainCars.split(';').forEach((car) => {
        if (operatorsAsJson['operators'][car]) {
            operatorProb.push.apply(operatorProb, operatorsAsJson['operators'][car]);
        }
    });
    if (operatorProb.length !== 0) {
        train.operator = getMostCommon(operatorProb);
        operatorsAsJson['categories'].forEach((category) => {
            if (category.operator === train.operator) {
                train.operator = category.operator;
                train.category = category.category[train.gameCategory.substring(0, 2)];
            }
        });
        operatorsAsJson['overwrite'].forEach((overwrite) => {
            if (overwrite.operator === train.operator) {
                if (overwrite['trainNoStartsWith'].some(a => train.trainNo.toString().startsWith(a))) {
                    train.operator = overwrite['operatorOverwrite'];
                    train.category = overwrite.category[train.gameCategory.substring(0, 2)];
                    train.trainName = overwrite['remarks'];
                }
            }
        });
        operatorsAsJson['trainNames'].forEach((trainName) => {
            if (trainName.operator === train.operator) {
                if (trainName['trainNo'].includes(train.trainNo.toString())) {
                    train.trainName = trainName['trainName'];
                    train.category = trainName['categoryOverwrite'];
                }
            }
        });
    }
    return train;
}

window.loadTimetablesFromUrl = (url) => {
    clearInterval(timetableInterval);
    clearInterval(getTimetablesInterval);
    clearInterval(getActiveStationsInterval);
    window.timetablesAPI = url;
    parser.makeAjaxRequest(timetablesAPI, 'timetablesAsJson').then(() => loadTimetables());
}

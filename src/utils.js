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

    train.departureAt = convertTime(timetable['timetable']['stopList'][0]['departureTimestamp']);
    train.arrivalAt = convertTime(timetable['timetable']['stopList'][timetable['timetable']['stopList'].length - 1]['arrivalTimestamp']);

    train.stoppedHere = stopPoint['stopped'];
    train.stopTime = stopPoint['stopTime'];
    train.trainNo = timetable['trainNo'];
    train.trainCars = timetable['stockString'];
    train.symbols = createSymbolsList(train.trainCars);
    train.gameCategory = timetable['timetable']['category'];
    train.category = train.gameCategory;
    train.operator = train.gameCategory;
    train.trainName = '';
    train.platform = 1;
    train.track = 2;

    if (stopPoint['comments'] && stopPoint['comments'].split(',').length > 1) {
        if (isNumber(stopPoint['comments'].split(',')[0])
            && isNumber(stopPoint['comments'].split(',')[1])) {
            train.platform = stopPoint['comments'].split(',')[0];
            train.track = stopPoint['comments'].split(',')[1];
        }
    }

    return train;
}

export function createRemark(delay = 0, beginsTerminatesHere, isStopped) {
    if (delay > 0) {
        if (isStopped) {
            if (overlayName === 'starysacz') { return `󠀠󠀠• Pociąg został zatrzymany na trasie • The train has been stopped on route •`; }
            return `Pociąg został zatrzymany na trasie/train has been stopped on route/Der Zug wurde auf der Strecke angehalten`;
        } else {
            if (overlayName === 'starysacz') { return `󠀠󠀠• Opóźniony ${delay}min • Delayed ${delay}min •󠀠󠀠󠀠󠀠`; }
            return `Opóźniony ${delay}min/delayed ${delay}min/Verspätung ${delay}min`;
        }
    } else if (beginsTerminatesHere) {
        if (isDeparture) {
            if (overlayName === 'starysacz') { return `󠀠󠀠• Pociąg rozpoczyna bieg • The train begins here • 󠀠󠀠󠀠󠀠`; }
            return 'Pociąg rozpoczyna bieg/train begins here/Zug beginnt hier';
        } else {
            if (overlayName === 'starysacz') { return `󠀠󠀠• Pociąg kończy bieg • The train terminates here • 󠀠󠀠󠀠󠀠`; }
            return 'Pociąg kończy bieg/train terminates here/Zug endet hier';
        }
    } else {
        return '';
    }
}

export function addRow(train, index) {
    let row = $('<tr>').attr('id', `${index}`);
    switch (overlayName) {
        case 'tomaszow':
            row.append($('<td>').text(convertTime(train.timestamp)));
            row.append($('<td>').append($('<div>').append($('<span>').text(createTrainString(train.category, train.trainNo)))));
            row.append($('<td>').append($('<span>').text(train.stationFromTo)));
            row.append($('<td>').append($('<span>')));
            row.append($('<td>').text(train.operator));
            row.append($('<td>').text(train.platform));
            row.append($('<td>').append($('<span>')));
            break;
        case 'krakow':
            row.append($('<td>')
                .append($('<p>').text(convertTime(train.timestamp)))
                .append($('<div>').addClass('indented')
                    .append($('<span>').text(createTrainString(train.category, train.trainNo)))
                )
            );
            row.append($('<td>').text(train.operator));
            row.append($('<td>')
                .append($('<div>')
                    .append($('<span>').text(train.stationFromTo))
                )
                .append($('<div>').addClass('indented')
                    .append($('<span>'))
                )
            );
            row.append($('<td>').append($('<span>')));
            row.append($('<td>').text(train.platform));
            break;
        case 'starysacz':
            row.append($('<td>').text(convertTime(train.timestamp)));
            row.append($('<td>')
                .append($('<p>').text(convertTime(train.operator)))
                .append($('<div>')
                    .append($('<span>').text(createTrainString(train.category, train.trainNo)))
                )
            );
            row.append($('<td>')
                .append($('<div>')
                    .append($('<span>').text(train.stationFromTo))
                )
                .append($('<div>').addClass('indented')
                    .append($('<span>'))
                )
            );
            row.append($('<td>').append($('<span>')));
            row.append($('<td>').text(train.platform));
            break;
        case 'plakat':
            if (train.operator === 'IC') {
                row.addClass('red');
                if (train.trainName) {
                    train.symbols = train.symbols.replace('j', 'j R');
                }
                train.symbols += ' p';
            }

            let symbolsDiv = $('<div>').addClass('symbols');
            if (isDeparture) {
                train.symbols.split(' ').forEach((symbol) => {
                    if (symbol === 'R') {
                        symbolsDiv.append($('<span>').addClass('symbol-text').text(symbol));
                        return;
                    }
                    symbol = carsDataAsJson['shortcuts'][symbol];
                    symbolsDiv.append($('<span>').addClass('material-symbols-outlined').text(symbol));
                });
            }

            row.append($('<td>').addClass('time').text(convertTime(train.timestamp)));
            row.append($('<td>').addClass('platform')
                .append($('<b>').text(train.platform).append($('<br>')))
                .append(train.track)
            );
            row.append($('<td>').addClass('operator')
                .append($('<div>')
                    .append($('<span>').addClass('train-category').text(train.operator).append($('<b>').text(train.category)))
                    .append($('<span>').addClass('train-no').append(train.trainNo))
                    .append($('<span>').addClass('train-name').append(train.trainName.toUpperCase()))
                    //.append($('<span>').addClass('material-symbols-outlined').append(symbols.join(' ')))
                    .append(symbolsDiv)
                )
            );
            row.append($('<td>').addClass('fromTo')
                .append($('<span>'))
                .append($('<span>').addClass('departure text-bold'))
            );
            break;
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

export function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
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

export function createDate() {
    let date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII',
        'IX', 'X', 'XI', 'XII'];
    return `${day} ${romanNumerals[month - 1]} ${year}`;
}


export function createSymbolsList(trainCars) {
    let symbols = '';
    trainCars.split(';').forEach((car) => {
        if (carsDataAsJson['symbols'][car]) {
            symbols += carsDataAsJson['symbols'][car];
        }
    });

    symbols = symbols.split('').filter(function(item, pos, self) {
        return self.indexOf(item) === pos;
    }).join('');

    let order = ['h', 'j', 'a', 'b', 'c', 'd', 'e', 'w', 'y'];
    let sortedSymbols = '';
    order.forEach((letter) => {
        if (symbols.includes(letter)) {
            sortedSymbols += letter;
        }
    });

    sortedSymbols = sortedSymbols.replace(/(.)(?=.)/g, '$1 ');
    return sortedSymbols;
}

window.loadTimetablesFromUrl = (url) => {
    clearInterval(timetableInterval);
    clearInterval(getTimetablesInterval);
    clearInterval(getActiveStationsInterval);
    window.timetablesAPI = url;
    parser.makeAjaxRequest(timetablesAPI, 'timetablesAsJson').then(() => loadTimetables());
};
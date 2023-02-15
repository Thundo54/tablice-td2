import * as parser from "./parser.js";
import * as utils from "./utils.js";
window.trainsSetBefore = [];
window.station = '';
window.timetableType = true;

$(document).ready(function() {
    let urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('type') !== null) {
        window.timetableType = true;
        if (urlParams.get('type') !== 'departure' && urlParams.get('type') !== 'arrival') {
            window.timetableType = true;
        } else if (urlParams.get('type') === 'arrival') {
            window.timetableType = false;
        }
        changeBoardType(timetableType);
    }

    if (urlParams.get('station') !== null) {
        window.station = urlParams.get('station');
        loadTimetables(station, timetableType);
        setInterval(function() {
            loadTimetables(station, timetableType);
            console.log('Timetables refreshed', station, timetableType);
        }, 50000);
    }

    $('#menu-button').click(function () {
        $('#menu-box').toggleClass('slide-in');
        $('#menu').toggleClass('background-fade');
        $('#menu-button').toggleClass('rotate-button');
    });

    $('#borderless-button').click(function () {
        $('#container').toggleClass('no-margin');
        $('#borderless-button').toggleClass('rotate-button');
        setTimeout(function() { $('#borderless-button').toggleClass('rotate-button'); }, 300);
    });

    $('#fullscr-button').click(function () {
        $('#fullscr-button').toggleClass('resize-button');
        setTimeout(function() { $('#fullscr-button').toggleClass('resize-button'); }, 200);
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then();
        } else {
            document.exitFullscreen().then();
        }
    });
});

$(window).resize(function() {
    clearTimeout(window.resizedFinished);
    window.resizedFinished = setTimeout(function(){
       refreshTimetablesAnim();
    }, 250);
});

function loadTimetables(station, isDeparture = true) {
    let trainsSetBefore = window.trainsSetBefore;
    let trainSet = parser.parseTimetable(station, isDeparture);
    let trainsNew = trainSet.filter(m => !trainsSetBefore.map(n => n.trainNo).includes(m.trainNo)); // pociągi które są w trainSet, ale nie ma ich w trainsSetBefore
    let trainsToRemove = trainsSetBefore.filter(m => !trainSet.map(n => n.trainNo).includes(m.trainNo)); // pociągi które są w trainsSetBefore, ale nie ma ich w trainSet
    if (trainsSetBefore.length === 0 && trainSet.length > 0 || $('#timetables table tr').length === 0) {
        for (let i in trainSet) {
            $('#timetables table').append(utils.addRow(
                trainSet[i]['timestamp'],
                trainSet[i]['trainNo'],
                trainSet[i]['stationFromTo'],
                trainSet[i]['timetable'].join(', '),
                trainSet[i]['category'],
                '1',
                '',
                i
            ));
        }
        utils.refreshIds()
    } else {
        if (trainsToRemove.length > 0) {
            for (let i in trainsToRemove) {
                let index = trainsSetBefore.indexOf(trainsToRemove[i])
                // console.log(`Usunięto pociąg ${trainsToRemove[i]['trainNo']} (${utils.convertTime(trainsToRemove[i]['timestamp'])}) => INDEX ${index}`)
                $(`#${index}`).remove();
                utils.refreshIds()
            }
        }
        if (trainsNew.length > 0) {
            // console.log("Pociągi do dodania", trainsNew);
            for (let i in trainsNew) {
                let index = trainSet.indexOf(trainsNew[i])
                // console.log(`Dodano pociąg ${trainsNew[i]['trainNo']} (${utils.convertTime(trainsNew[i]['timestamp'])}) => INDEX ${index}`)
                let row = utils.addRow(
                    trainsNew[i]['timestamp'],
                    trainsNew[i]['trainNo'],
                    trainsNew[i]['stationFromTo'],
                    trainsNew[i]['timetable'].join(', '),
                    trainsNew[i]['category'],
                    '1',
                    '',
                    i
                );
                if (index === 0) {
                    $(`#1`).before(row);
                } else {
                    $(`#${index-1}`).after(row);
                }
                utils.refreshIds()
            }
        }
    }
    for (let i in trainSet) {
        //console.log(trainSet[i]['trainNo'], trainSet[i]['timestamp'], trainSet[i]['delay'], i);
        $(`#${i} td:nth-child(7) span`)
            .text(utils.createRemark(
                trainSet[i]['delay'],
                isDeparture,
                trainSet[i]['beginsTerminatesHere'],
            ));
    }
    refreshTimetablesAnim();
}

export function refreshTimetablesAnim() {
    let tr = $('#timetables table').find('tr');
    let td, p, animDuration;
    for (let i = 0; i < tr.length; i++) {
        td = $(tr[i]).find('td');
        for (let j = 0; j < td.length; j++) {
            p = $(td[j]).find('span');
            animDuration = ((p.width() + $(td[j]).width()) * 10) / 950;
            if (p.css('animation-duration') !== animDuration) {
                if (p.width() > $(td[j]).width()) {
                    p.css('animation', `ticker linear ${animDuration}s infinite`);
                    p.css('--elementWidth', $(td[j]).width());
                } else {
                    p.css('animation', '');
                }
            }
        }
    }
}

function changeBoardType(timeTableType) {
    let titlePL, titleEN, description, containerColor;
    if (timeTableType) {
        titlePL = 'Odjazdy';
        titleEN = 'Departures';
        description = 'Do<br><i>Destination</i>';
        containerColor = 'yellow-text';
    } else {
        titlePL = 'Przyjazdy';
        titleEN = 'Arrivals';
        description = 'Z<br><i>From</i>';
        containerColor = 'white-text';
    }
    $('.title-pl').text(titlePL);
    $('.title-en').text(titleEN);
    $('#labels table th:nth-child(3)').html(description);
    $('#container').removeClass().addClass(containerColor);
}




// function getSceneries() {
//     let responseText = $.ajax({
//         url: 'https://spythere.pl/api/getSceneries',
//         async: false}).responseText;
//     return JSON.parse(responseText);
// }
//
// function capitalizeFirstLetter(string) {
//     if (string === string.toUpperCase()) {
//         let output = '';
//         string.split(' ').forEach((element) => {
//             output += element.charAt(0).toUpperCase() + element.slice(1).toLowerCase() + ' '
//         });
//         return output.slice(0, -1);
//     } else {
//         return string;
//     }
// }
//
// function splitRoute(string) {
//     let stations = [];
//     string.split('|').forEach((element) => {
//         stations.push(capitalizeFirstLetter(element));
//     });
//     return stations;
// }
//
// function parseTimetable(station, isDeparture = true) {
//     let trainSet = [], train = {}, stopList = [];
//     let data = getTimetables();
//     for (let i in data) {
//         if (data[i]['timetable'] === undefined) { continue; }
//         for (let j in data[i]['timetable']['stopList']) {
//             if (data[i]['timetable']['stopList'][j]['stopType'].includes('ph')) {
//                 stopList.push(capitalizeFirstLetter(data[i]['timetable']['stopList'][j]['stopNameRAW'].split(',')[0]));
//             }
//             if (capitalizeFirstLetter(data[i]['timetable']['stopList'][j]['stopNameRAW']) === station) {
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
//             console.log(train);
//         }
//         stopList = [];
//         train = {};
//     }
//
//     window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
//     return trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
// }
//
//
// function parseTimetable(station, isDeparture = true) {
//     let trainSet = [], stopList = [];
//     let data = getTimetables();
//     for (let i in data) {
//         let timetable = data[i]['timetable'];
//         if (timetable === undefined) { continue; }
//         let stopListData = timetable['stopList'];
//         for (let j in stopListData) {
//             let stopData = stopListData[j];
//             let stopType = stopData['stopType'];
//             let stopName = capitalizeFirstLetter(stopData['stopNameRAW']);
//             if (stopType.includes('ph')) {
//                 stopList.push(stopName.split(',')[0]);
//             }
//             if (stopName === station) {
//                 if (isDeparture && !stopData['terminatesHere']) {
//                     continue;
//                 }
//                 if (!isDeparture && !stopData['beginsHere']) {
//                     continue;
//                 }
//                 if (stopData['confirmed']) {
//                     break;
//                 }
//                 let train = {
//                     'beginsTerminatesHere': isDeparture ? stopData['beginsHere'] : stopData['terminatesHere'],
//                     'timestamp': isDeparture ? stopData['departureTimestamp'] : stopData['arrivalTimestamp'],
//                     'delay': isDeparture ? stopData['departureDelay'] : stopData['arrivalDelay'],
//                     'stationFromTo': splitRoute(timetable['route'])[isDeparture ? 1 : 0],
//                     'category': timetable['category'],
//                     'trainNo': data[i]['trainNo'],
//                     'timetable': isDeparture ? stopList.slice(stopList.indexOf(station) + 1) : stopList.slice(0, stopList.indexOf(station))
//                 };
//                 trainSet.push(train);
//                 console.log(train);
//                 break;
//             }
//         }
//     }
//
//     window.trainsSetBefore = trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
//     return trainSet.sort((a, b) => { return a.timestamp - b.timestamp });
// }
//
// function loadSceneries() {
//     let data = parser.getTimetables();
//     let sceneries = getSceneries();
//     let stations = [];
//     for (let i in data) {
//         if (data[i]['timetable'] === undefined) { continue; }
//         for (let j in data[i]['timetable']['stopList']) {
//             if (data[i]['timetable']['stopList'][j]['confirmed']) { continue; }
//             if (data[i]['timetable']['stopList'][j]['mainStop'] && data[i]['region'] === 'eu') {
//                 stations.push(data[i]['timetable']['stopList'][j]['stopNameRAW']);
//             }
//         }
//     }
//     stations = stations.filter((v, i, a) => a.indexOf(v) === i);
//     for (let i in stations) {
//         for (let j in sceneries) {
//             if (sceneries[j]['checkpoints'] === null) { continue; }
//             if (sceneries[j]['checkpoints'].toLowerCase().includes(stations[i].toLowerCase())) {
//                 console.log(stations[i]);
//                 stations[i] = sceneries[j]['name'];
//             }
//         }
//     }
//     stations = stations.filter((v, i, a) => a.indexOf(v) === i);
//     // sort stations by name
//     stations.sort((a, b) => {
//         if (a < b) { return -1; }
//         if (a > b) { return 1; }
//         return 0;
//     });
//     for (let i in stations) {
//         $('#active-timetables').append($('<option>').text(capitalizeFirstLetter(stations[i])));
//     }
//
//     console.log(stations);
// }
//
//
// function editRowRemarks(row, remarks) {
//     $(`#timetables table tr:nth-child(${row}) td:nth-child(7) p`).text(remarks);
// }
//
// function deleteRow(row) {
//     $(`#timetables table tr:nth-child(${row})`).remove();
// }
//
//
// function generateRowsList() {
//     let rowsList = {};
//     $(`#timetables table tr`).each(function () {
//         let trainNo = $(this).attr('id');
//         rowsList[trainNo] = $(this).index() + 1;
//     });
//     return rowsList;
// }
//
// function getTrainsFromRows() {
//     let train = {}, trains = {};
//     $(`#timetables table tr td:nth-child(2) p`).each(function () {
//         train['rowNo'] = $(this).closest('tr').index() + 1;
//         trains[($(this).text()).split(' ')[1]] = train;
//         train = {};
//     });
//     return trains;
// }
// window.scenery = ""
// function changeTimetables() {
//     let option = $('#active-timetables option:selected').text();
//     $('#timetables table tr').remove();
//     window.scenery = option;
//     loadTimetables(option, false);
// }
//
// function changeTableVersion() {
//     let option = $('#tables option:selected').index();
//     $('#timetables table tr').remove();
//     if (option === 0) {
//         changeBoardType(true);
//             loadTimetables(window.scenery);
//     } else {
//         changeBoardType(false);
//             loadTimetables(window.scenery, false);
//     }
//
// }
//
// function changeTableVersion() {
//     let option = $('#tables option:selected').index();
//     $('#timetables tr').remove();
//     if (option === 0) {
//         changeBoardType(true);
//             loadTimetables(window.scenery);
//     } else {
//         changeBoardType(false);
//             loadTimetables(window.scenery, false);
//     }
//
// }
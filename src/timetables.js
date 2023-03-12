import * as parser from "./parser.js";
import * as utils from "./utils.js";
window.trainsSetBefore = [];
window.stationsSet = [];
window.station = '';
window.isDeparture = localStorage.getItem('isDeparture') === 'true';
window.isMargin = localStorage.getItem('isMargin') === 'true';
window.timetablesAsJson = null;
window.stationDataAsJson = null;
window.activeStationsAsJson = null;
window.stopTypes = JSON.parse(localStorage.getItem('stopTypes')) || ['ph'];
window.trainTypes = ['TOW', 'PAS', 'LUZ', 'UG']
window.onlyStop = false;

$(document).ready(function() {
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('timetables') !== null) {
        if (urlParams.get('timetables') === 'departure') {
            window.isDeparture = true;
        } else {
            window.isDeparture = urlParams.get('timetables') !== 'arrival';
        }
    }

    if (urlParams.get('margin') !== null) {
        window.isMargin = urlParams.get('margin') === 'true';
    }

    changeBoardType();
    toggleMargin();

    parser.getStationsData();
    parser.getTimetables();
    parser.getActiveStations();

    setInterval(function() {
        parser.getTimetables();
    }, 50000);

    setInterval(function() {
        parser.getActiveStations();
    }, Math.floor(Math.random() * (90000 - 60000 + 1)) + 60000);

    setTimeout(function() {
        if (urlParams.get('station') !== null) {
            window.station = urlParams.get('station').replace('_', ' ')
            stationDataAsJson.forEach((stationData) => {
                if (stationData['name'] === station) {
                    if (stationData['checkpoints'] === null || stationData['checkpoints'] === '') { return; }
                    window.station = stationData['checkpoints'].split(';')[0];
                }
            });
            createTimetableInterval();
        }
    }, 500);


    $('#menu-button').click(function () {
        toggleMenu();
    });

    $('#close-box').click(function () {
        toggleMenu();
    });

    $('#type-button').click(function () {
        let typeButton = $('#type-button');
        window.isDeparture = !isDeparture;
        localStorage.isDeparture = isDeparture;
        changeBoardType(isDeparture);
        loadTimetables(station, isDeparture);
        if (isDeparture) {
            typeButton.toggleClass('rotate-button-left');
            setTimeout(function() { typeButton.toggleClass('rotate-button-left'); }, 400);
        } else {
            typeButton.toggleClass('rotate-button-right');
            setTimeout(function() { typeButton.toggleClass('rotate-button-right'); }, 400);
        }
    });

    $('#margin-button').click(function () {
        let marginButton = $('#margin-button');
        window.isMargin = !isMargin;
        localStorage.setItem('isMargin', isMargin);
        if (!isMargin) {
            marginButton.toggleClass('resize-button-up');
            setTimeout(function() { marginButton.toggleClass('resize-button-up'); }, 350);
        } else {
             marginButton.toggleClass('resize-button-down');
            setTimeout(function() { marginButton.toggleClass('resize-button-down'); }, 350);
        }
        toggleMargin();
    });

    $('#sceneries').change(function() {
        parser.refreshCheckpointsList();
        window.station = $('#checkpoints option').val();
        createTimetableInterval();
    });

    $('#checkpoints').change(function() {
        window.station = $(this).val();
        createTimetableInterval();
    });

    $(document).bind('keydown', function(e) {
        if (e.which === 121) {
            e.preventDefault();
            $('#button-box').toggleClass('hidden');
        } else if (e.which === 70) {
            e.preventDefault();
            toggleMenu();
        } else if (e.which === 68) {
            e.preventDefault();
            $('#type-button').click();
        }

        if (e.which === 27) {
            e.preventDefault();
            if (!$('#menu-box').hasClass('slide-in')) {
                toggleMenu();
            }
        }
    });
});

$(window).resize(function() {
    clearTimeout(window.resizedFinished);
    window.resizedFinished = setTimeout(function(){
       refreshTimetablesAnim();
    }, 250);
});

function toggleMargin() {
    let container = $('#container');
    if (!isMargin) {
        container.addClass('no-margin');
    } else {
        container.removeClass('no-margin');
    }
}

function toggleMenu() {
    $('#close-box').toggleClass('active');
    $('#menu').toggleClass('background-fade');
    $('#menu-box').toggleClass('slide-in');
    $('#menu-button').toggleClass('rotate-button-right');
}

function createTimetableInterval() {
    clearInterval(window.timetableInterval);
    $('#timetables table tr').remove();
    setTimeout(function() {
        loadTimetables(station, isDeparture);
    }, 500);
    window.timetableInterval = setInterval(function() {
        loadTimetables(station, isDeparture);
        parser.refreshSceneriesList();
    }, 30000);
}

function loadTimetables(station, isDeparture = true) {
    let trainSet = parser.parseTimetable(station, isDeparture);
    if (trainSet === undefined) { return; }
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
                trainSet[i]['stoppedHere']
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

function changeBoardType() {
    let titlePL, titleEN, description
    let container = $('#container');
    $('#timetables table tr').remove();
    if (isDeparture) {
        titlePL = 'Odjazdy';
        titleEN = 'Departures';
        description = 'Do<br><i>Destination</i>';
    } else {
        titlePL = 'Przyjazdy';
        titleEN = 'Arrivals';
        description = 'Z<br><i>From</i>';
    }
    $('.title-pl').text(titlePL);
    $('.title-en').text(titleEN);
    $('#labels table th:nth-child(3)').html(description);
    if (!isDeparture) {
        container.addClass('white-text');
        container.removeClass('yellow-text');
    } else {
        container.addClass('yellow-text');
        container.removeClass('white-text');
    }
}
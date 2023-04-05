import * as parser from "./parser.js";
import * as utils from "./utils.js";
window.trainsSetBefore = [];
window.stationsSet = [];
window.station = '';
window.isDeparture = localStorage.getItem('isDeparture') === 'true';
window.isMargin = localStorage.getItem('isMargin') === 'true';
window.timetableSize = localStorage.getItem('timetableSize') || 'normal';
window.stopTypes = JSON.parse(localStorage.getItem('stopTypes')) || ['ph'];
window.trainTypes = JSON.parse(localStorage.getItem('trainTypes')) || ['EMRPA'];
window.timetablesAsJson = null;
window.stationDataAsJson = null;
window.activeStationsAsJson = null;

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
    initzializeMenu();

    parser.getTimetables().then();

    window.getTimetablesInterval = setInterval(function() {
        parser.getTimetables().then();
    }, 50000);

    window.getActiveStationsInterval = setInterval(function() {
        parser.getActiveStations().then();
    }, 50000);

    parser.getStationsData().then(() => {
        parser.getActiveStations().then(() => parser.generateStationsList());
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
    });

    $('#menu-button').mousedown(function () {
        toggleMenu();
    });

    $('#close-box').click(function () {
        toggleMenu();
    });

    $('#type-button').mousedown(function () {
        let typeButton = $('#type-button');
        window.isDeparture = !isDeparture;
        localStorage.isDeparture = isDeparture;
        changeBoardType();
        loadTimetables();
        if (isDeparture) {
            typeButton.addClass('turn');
        } else {
            typeButton.removeClass('turn');
        }
    });

    $('#margin-button').mousedown(function () {
        window.isMargin = !isMargin;
        localStorage.isMargin = isMargin;
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

    $('#timetable-size').change(function() {
        window.timetableSize = $(this).val();
        localStorage.timetableSize = timetableSize;
        toggleSize();
    });

    $('.stop-type').click(function() {
        let switchId = $(this).attr('id');
        if (stopTypes.includes(switchId)) {
            $(this).removeClass('active');
            stopTypes.splice(stopTypes.indexOf(switchId), 1);
        } else {
            if (switchId === 'all') {
                window.stopTypes = ['all'];
                $('#stop-types a').removeClass('active');
            } else {
                $('#all').removeClass('active');
                if (stopTypes.includes('all')) {
                    stopTypes.splice(stopTypes.indexOf('all'), 1);
                }
                stopTypes.push(switchId);
            }
            $(this).addClass('active');

        }
        localStorage.setItem('stopTypes', JSON.stringify(stopTypes));
        loadTimetables();
    });

    $('.train-type').mousedown(function() {
        let switchId = $(this).attr('id');
        if (trainTypes.includes(switchId)) {
            $(this).removeClass('active');
            trainTypes.splice(trainTypes.indexOf(switchId), 1);
        } else {
            $(this).addClass('active');
            trainTypes.push(switchId);
        }
        localStorage.setItem('trainTypes', JSON.stringify(trainTypes));
        loadTimetables();
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
            $('#type-button').mousedown();
        }

        if (e.which === 27) {
            e.preventDefault();
            if ($('#menu-box').hasClass('popup')) {
                toggleMenu();
            }
        }
    });

    $('.menu-page-switcher').mousedown(function() {
        switchMenuPage();
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

function toggleSize() {
    let timetables = $('#timetables');
    let labels = $('#labels');
    if (timetableSize === 'normal') {
        timetables.removeClass('enlarged');
        labels.removeClass('enlarged');
    } else {
        timetables.addClass('enlarged');
        labels.addClass('enlarged');
    }
    refreshTimetablesAnim();
}

function toggleMenu() {
    $('#close-box').toggleClass('active');
    $('#menu').toggleClass('background-fade');
    $('#menu-box').toggleClass('popup');
    $('#menu-button').toggleClass('rotate-button-right');
}

function createTimetableInterval() {
    clearInterval(timetableInterval);
    $('#timetables table tr').remove();
    loadTimetables();
    document.title = `${utils.capitalizeFirstLetter(station)} - Tablice Zbiorcze`
    window.timetableInterval = setInterval(function() {
        loadTimetables();
        parser.refreshSceneriesList();
    }, 30000);
}

export function loadTimetables() {
    let trainsSetBefore = window.trainsSetBefore;
    let trainSet = parser.parseTimetable();
    if (trainSet === undefined) { return; }
    let trainsNew = trainSet.filter(m => !trainsSetBefore.map(n => n.trainNo).includes(m.trainNo));
    let trainsToRemove = trainsSetBefore.filter(m => !trainSet.map(n => n.trainNo).includes(m.trainNo));
    if (trainsSetBefore.length === 0 && trainSet.length > 0 || $('#timetables table tr').length === 0) {
        trainSet.forEach((train, index) => {
            $('#timetables table').append(utils.addRow(
                train.timestamp,
                train.trainNo,
                train.stationFromTo,
                '',
                train.category,
                '1',
                '',
                index
            ));
        });
        utils.refreshIds();
    } else {
        if (trainsToRemove.length > 0) {
            trainsToRemove.forEach((train) => {
                $(`#${trainsSetBefore.indexOf(train)}`).remove();
            });
            utils.refreshIds();
        }
        if (trainsNew.length > 0) {
            trainsNew.forEach((train) => {
                let index = trainSet.indexOf(train);
                let row = utils.addRow(
                    train.timestamp,
                    train.trainNo,
                    train.stationFromTo,
                    '',
                    train.category,
                    '1',
                    '',
                    index
                );
                if (index === 0) {
                     $('#timetables table').prepend(row);
                } else {
                    $(`#${index-1}`).after(row);
                }
                utils.refreshIds();
            });
        }
    }
    trainSet.forEach((train, index) => {
        $(`#${index} td:nth-child(7) span`)
            .text(utils.createRemark(
                train.delay,
                train.beginsTerminatesHere,
                train.stoppedHere
            ));

        $(`#${index} td:nth-child(4) span`)
            .text(train.timetable.join(', '));
    });
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

function initzializeMenu () {
    stopTypes.forEach((stopType) => {
        $(`#${stopType}`).addClass('active');
    });

    trainTypes.forEach((trainType) => {
        $(`#${trainType}`).addClass('active');
    });

    trainCategory.forEach((trainCategory) => {
        $(`#${trainCategory}`).addClass('active');
    });

    if (isDeparture) {
            $('#type-button').addClass('turn');
        } else {
            $('#type-button').removeClass('turn');
        }

    $('#timetable-size').val(timetableSize);
    toggleSize();
}
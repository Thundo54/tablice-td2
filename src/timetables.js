import * as parser from "./parser.js";
import * as utils from "./utils.js";
window.trainsSetBefore = [];
window.stationsSet = [];
window.station = '';
window.isDeparture = localStorage.getItem('isDeparture') === 'true';
window.isStopped = localStorage.getItem('isStopped') === 'true';
window.timetableSize = localStorage.getItem('timetableSize') || 'normal';
window.stopTypes = JSON.parse(localStorage.getItem('stopTypes')) || ['ph'];
window.trainTypes = JSON.parse(localStorage.getItem('trainTypes')) || ['EMRPA'];
window.overlayName = localStorage.getItem('overlayName') || 'krakow';
window.showOperators = localStorage.getItem('showOperators') || 'false';
window.region = localStorage.getItem('region') || 'eu';
window.timetablesAsJson = null;
window.stationDataAsJson = null;
window.activeStationsAsJson = null;
window.operatorsAsJson = null;
window.namesCorrectionsAsJson = null;
window.carsDataAsJson = null;
window.timetableInterval = null;
window.currentOverlay = null;
window.timetableRows = null;
window.resizedFinished = null;
window.urlParams = null;
window.timetablesAPI = 'https://stacjownik.spythere.eu/api/getActiveTrainList';
window.activeStationsAPI = 'https://api.td2.info.pl/?method=getStationsOnline';
window.carsDataAPI = "https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/carsData.json"
window.stationAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/stationsData.json';
window.operatorsAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/operatorConvert.json';
window.namesCorrectionsAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/namesCorrections.json';
window.trainCategory = JSON.parse(localStorage.getItem('trainCategory')) ||
    ['EI', 'MP', 'RP', 'RO', 'TM', 'LT', 'TK', 'ZG', 'ZX', 'AP'];

$(document).ready(() => {



    window.urlParams = new URLSearchParams(window.location.search);

    let stationsRequest;
    let timetablesRequest;
    let operatorsRequest;
    let carsDataRequest;

    if (urlParams.get('timetables') !== null) {
        if (urlParams.get('timetables') === 'departure') {
            window.isDeparture = true;
        } else {
            window.isDeparture = urlParams.get('timetables') !== 'arrival';
        }
    }

    initzializeOverlay();
    initzializeMenu();

    timetablesRequest = parser.makeAjaxRequest(timetablesAPI, 'timetablesAsJson').then();
    operatorsRequest = parser.makeAjaxRequest(operatorsAPI, 'operatorsAsJson').then(() => {
        window.operatorsAsJson = operatorsAsJson[0];
    });

    carsDataRequest = parser.makeAjaxRequest(carsDataAPI, 'carsDataAsJson').then(
        () => {
            if (overlayName === 'plakat') {
                $(`#timetables-cycle`)
                    .text(carsDataAsJson['timetables-cycle']);

                $(`#update-time`)
                    .text(`Aktualizacja wg stanu na ${utils.createDate()}`);
            }
        }
    );

    parser.makeAjaxRequest(namesCorrectionsAPI, 'namesCorrectionsAsJson').then();

    window.getTimetablesInterval = setInterval(() => {
        parser.makeAjaxRequest(timetablesAPI, 'timetablesAsJson').then();
    }, 50000);

    window.getActiveStationsInterval = setInterval(() => {
        parser.makeAjaxRequest(activeStationsAPI, 'activeStationsAsJson').then();
    }, 50000);

    stationsRequest = parser.makeAjaxRequest(stationAPI, 'stationDataAsJson').then(() => {
        parser.makeAjaxRequest(activeStationsAPI, 'activeStationsAsJson')
            .then(() => {
                parser.generateStationsList();
                parser.selectCheckpoint();
            });
    });

    $.when(timetablesRequest, stationsRequest, operatorsRequest, carsDataRequest).done(() => {
        if (urlParams.get('station') !== null) {
            window.station = urlParams.get('station').replace('_', ' ')
            if (urlParams.get('checkpoint') !== null) {
                let checkpoint = urlParams.get('checkpoint').replace('_', ' ');
                if (checkpoint.includes(',') && !checkpoint.split(',')[1].includes('.')) {
                    checkpoint += '.';
                }
                window.station = checkpoint
            }
            createTimetableInterval();
        }
    });

    $('#menu-button').mousedown(() => {
        toggleMenu();
    });

    $('#close-box').click(() => {
        toggleMenu();
    });

    $('#type-button').mousedown(function () {
        let typeButton = $('#type-button');
        window.isDeparture = !isDeparture;
        localStorage.isDeparture = isDeparture;
        changeBoardType();
        loadTimetables();
        refreshTimetablesAnim();
        utils.resizeTimetableRow();
        if (isDeparture) {
            typeButton.addClass('turn');
        } else {
            typeButton.removeClass('turn');
        }
    });

    $('#sceneries').change(function() {
        parser.refreshCheckpointsList();
        window.station = $('#checkpoints option').val();
        createTimetableInterval();
    });

    $('#checkpoints').change(function(){
        window.station = $(this).val();
        createTimetableInterval();
    });

    $('#timetable-size').change(function() {
        window.timetableSize = $(this).val();
        localStorage.timetableSize = timetableSize;
        toggleSize();
    });

    $('#td2-region').change(function() {
        window.region = $(this).val();
        localStorage.region = region;
        toggleRegion();
    });

    $('#overlay').change(function() {
        window.currentOverlay = overlayName;
        window.overlayName = $(this).val();
        localStorage.overlayName = overlayName;
        changeOverlay();
    });

    $('.stop-type').mousedown(function() {
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

    $('.train-category').mousedown(function() {
        let switchId = $(this).attr('id');
        if (trainCategory.includes(switchId)) {
            $(this).removeClass('active');
            if (switchId === 'RO') {
                trainCategory.splice(trainCategory.indexOf('AP'), 1);
            }
            trainCategory.splice(trainCategory.indexOf(switchId), 1);
        } else {
            $(this).addClass('active');
             if (switchId === 'RO') {
                trainCategory.push('AP');
            }
            trainCategory.push(switchId);
        }
        loadTimetables();
    });

    $('#toggle-stop').mousedown(function() {
        window.isStopped = !isStopped;
        localStorage.isStopped = isStopped;
        toggleStopped();
    });

    $('#toggle-operators').mousedown(function() {
        window.showOperators = !showOperators;
        localStorage.showOperators = showOperators;
        toggleOperators();
    });

    $('#reset-filter').mousedown(function() {
        localStorage.removeItem('stopTypes');
        localStorage.removeItem('trainTypes');
        localStorage.removeItem('trainCategory');
        localStorage.removeItem('isStopped');
        window.stopTypes = ['ph'];
        window.trainTypes = ['EMRPA'];
        window.trainCategory = ['EI', 'MP', 'RP', 'RO', 'TM', 'LT', 'TK', 'ZG', 'ZX', 'AP'];
        window.isStopped = false;
        window.showOperators = false;
        initzializeMenu();
        loadTimetables();
    });

    $(document).bind('keydown', (e) => {
        switch (e.which) {
            case 121:
                e.preventDefault();
                $('#button-box').toggleClass('hidden');
            break;
            case 70:
                e.preventDefault();
                toggleMenu();
            break;
            case 68:
                e.preventDefault();
                $('#type-button').mousedown();
            break;
            case 122:
                setTimeout(() => {
                    utils.resizeTimetableRow();
                }, 10);
            break;
            case 27:
                e.preventDefault();
                if ($('#menu-box').hasClass('popup') || $('#menu-box-2').hasClass('popup')) {
                toggleMenu();
                }
            break;
        }
    });

    $('.menu-page-switcher').mousedown(() => {
        switchMenuPage();
    });
});

$(window).resize(function() {
    clearTimeout(resizedFinished);
    window.resizedFinished = setTimeout(() => {
       refreshTimetablesAnim();
       utils.resizeTimetableRow();
    }, 250);
});


$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', () => {
    refreshTimetablesAnim();
    utils.resizeTimetableRow();
});

function changeOverlay() {
    $('#board').load(`src/overlays/${overlayName}.html`, () => {
        $(`link[href="src/${currentOverlay}.css"]`).attr('href',`src/${overlayName}.css`);
        setRowsCount();

        setTimeout(() => {
            changeBoardType();
            loadTimetables();
            toggleSize();
        }, 10);
        refreshTimetablesAnim();
    });
}

function toggleStopped() {
    let toggleStop = $('#toggle-stop');
    if (isStopped) {
        toggleStop.addClass('active');
    } else {
        toggleStop.removeClass('active');
    }
    loadTimetables();
}

function toggleOperators() {
    let toggleOperators = $('#toggle-operators');
    if (showOperators) {
        toggleOperators.addClass('active');
    } else {
        toggleOperators.removeClass('active');
    }
    loadTimetables();
}

function toggleSize() {
    let timetables = $('#timetables');
    let labels = $('#labels');
    if (timetableSize === 'normal') {
        timetables.removeClass('enlarged');
        labels.removeClass('enlarged');
        setRowsCount();
    } else {
        timetables.addClass('enlarged');
        labels.addClass('enlarged');
        setRowsCount();
    }
    refreshTimetablesAnim();
    utils.resizeTimetableRow();
}

function toggleRegion() {
    parser.refreshSceneriesList();
    loadTimetables();
}

function toggleMenu() {
    let menuBox = $('#menu-box');
    let menuBox2 = $('#menu-box-2');
    $('#close-box').toggleClass('active');
    $('#menu').toggleClass('background-fade');
    $('#menu-button').toggleClass('fill');
    if (menuBox2.hasClass('popup')) { menuBox2.toggleClass('popup'); }
    else { menuBox.toggleClass('popup');}
}

function switchMenuPage() {
    $('#menu-box').toggleClass('popup');
    $('#menu-box-2').toggleClass('popup');
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

    let sceneries = $('#sceneries');
    let url = window.location.href;
    if (sceneries.val() !== null) {
        url = `?station=${sceneries.val()}`;
        if ($('#checkpoints').prop('selectedIndex') !== 0) {
            url += `&checkpoint=${station.replace(new RegExp('.$', ), '')}`;
        }
    }
    window.history.replaceState(null, null, url);
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
                train.operator,
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
                    train.operator,
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
        let remark = utils.createRemark(
                train.delay,
                train.beginsTerminatesHere,
                train.stoppedHere
        );

        if (train.trainName !== '') {
            if (overlayName === 'warszawa') {
                train.trainName = `󠀠󠀠••• <b><i>${train.trainName}</i></b> •••󠀠󠀠󠀠󠀠${remark.replace('•', '')}`;
            }
            else { train.trainName = `*** ${train.trainName.toUpperCase()} *** ${remark}`; }
        } else {
            train.trainName = remark;
        }

        if (overlayName === 'tomaszow') {
            $(`#${index} td:nth-child(2) span`)
                .html(`${train.category} ${train.trainNo}`);
            $(`#${index} td:nth-child(5)`)
                .html(train.operator);
            $(`#${index} td:nth-child(7) span`)
                .html(train.trainName);
        } else if (overlayName === 'krakow') {
            $(`#${index} td:nth-child(1) span:last-child`)
                .html(`${train.category} ${train.trainNo}`);

            $(`#${index} td:nth-child(2)`)
                .html(train.operator);

            $(`#${index} td:nth-child(3) .indented span`)
                .html(train.trainName);
        } else {
            $(`#${index} td:nth-child(2) p`)
                .html(train.operator);

            $(`#${index} td:nth-child(2) span`)
                .html(`${train.category} ${train.trainNo}`);

            if (train.trainName === '') {
                $(`#${index} td:nth-child(3)`).css('vertical-align', `middle`);
                $(`#${index} td:nth-child(3) .indented`).css('display', `none`);
            }

            $(`#${index} td:nth-child(3) .indented span`)
                .html(train.trainName);
        }

        $(`#${index} td:nth-child(4) span`)
            .text(train.timetable.join(', '));
    });
    if (timetableRows > 0) {
        for (let i = timetableRows; i < trainSet.length; i++) {
            $(`#${i}`).remove();
        }
    }
    refreshTimetablesAnim();
    utils.resizeTimetableRow()
}

export function refreshTimetablesAnim() {
    let tr = $('#timetables table tr');
    let td, span, animDuration, fieldWidth, widthRatio, tdWidth;
    if (overlayName === 'warszawa') { widthRatio = 1; }
    else { widthRatio = 0.9; }

    // complete rewrite of this function is needed
    for (let i = 0; i < tr.length; i++) {
        td = $(tr[i]).find('td');
        tdWidth = $(td[2]).width() + $(td[3]).width();
        if (i >= timetableRows) { return; }
        for (let j = 0; j < td.length; j++) {
            span = $(td[j]).find('span');
            if (span.text().length <= 0) { continue; }
            for (let k = 0; k < span.length; k++) {
                fieldWidth = $(td[j]).width();
                if ($(td[j]).find('.indented span').text().length > 0 && overlayName === 'warszawa') {
                    $(td[j]).find('.indented').css('position', 'fixed');
                    $(td[j+1]).css('vertical-align', 'top');
                    $(td[j+1]).css('padding', '1vmin 0');
                    fieldWidth = $(td[j]).width() + $(td[j+1]).width();
                }

                animDuration = (($(span[k]).width() + fieldWidth) * 10) / 400;

                if ($(span[k]).css('animation-duration') !== animDuration) {
                    if ($(span[k]).width() > fieldWidth*widthRatio) {
                        $(span[k]).css('animation', `ticker linear ${animDuration}s infinite`);
                        $(span[k]).css('--elementWidth', fieldWidth);
                    } else {
                        $(span[k]).css('animation', '');
                    }
                }
            }
        }
    }
}

function changeBoardType() {
    let titlePL, titleEN, description, description2;
    let container = $('#container');
    $('#timetables table tr').remove();
    if (isDeparture) {
        titlePL = 'Odjazdy';
        titleEN = 'Departures';
        description = 'Do<br><i>Destination</i>';
        // description2 = '<i><b>Godzina odjazdu, przewoźnik, nr pociągu</b><br>\n' +
        //     'Time of departure, operator, train no.</i>';
        description2 = '<i><b>Godzina odjazdu</b><br>Time of departure</i>';
        if (overlayName === 'warszawa') {
            description = '<i><b>Stacja docelowa, dodatkowe informacje</b><br>\n' +
                'Destination, additional information</i>';
        }
    } else {
        titlePL = 'Przyjazdy';
        titleEN = 'Arrivals';
        description = 'Z<br><i>From</i>';
        // description2 = '<i><b>Godzina przyjazdu, przewoźnik, nr pociągu</b><br>' +
        //     'Time of arrival,<br> operator, train no.</i>';
        description2 = '<i><b>Godzina<br>przyjazdu,</b><br>Time of<br>arrival</i>';
        if (overlayName === 'warszawa') {
            description = '<i><b>Stacja początkowa, dodatkowe informacje</b><br>\n' +
                'Origin, additional information</i>';
        }
    }
    $('.title-pl').html(titlePL);
    $('.title-en').html(titleEN);
    if (overlayName === 'warszawa') {
        //$('#labels table th:nth-child(3)').html(description);
        //$('#labels table th:nth-child(1)').html(description2);
    } else {
        $('#labels table th:nth-child(3)').html(description);
    }
    if (!isDeparture) {
        container.addClass('white-text');
        container.removeClass('yellow-text');
    } else {
        container.addClass('yellow-text');
        container.removeClass('white-text');
    }
}

function initzializeMenu () {
    $(`.train-type`).removeClass('active');
    $(`.stop-type`).removeClass('active');
    $(`.train-category`).removeClass('active');

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
    $('#region').val(region);
    $('#overlay').val(overlayName)
    toggleStopped();
    toggleOperators();
    toggleRegion();
    toggleSize();
}

function initzializeOverlay() {
    $('#board').load(`src/overlays/${overlayName}.html`, () => {
        $(`link[href="src/tomaszow.css"]`).attr('href',`src/${overlayName}.css`);
        utils.resizeTimetableRow();
        changeBoardType();
        toggleSize();
        setRowsCount();
    });
}

function setRowsCount() {
    if (timetableSize === 'normal') {
        if (overlayName === 'krakow') {
            window.timetableRows = 10;
        } else if (overlayName === 'warszawa') {
            window.timetableRows = 7;
        } else {
            window.timetableRows = 0;
        }
    } else {
        if (overlayName === 'krakow') {
            window.timetableRows = 6;
        } else if (overlayName === 'warszawa') {
            window.timetableRows = 7;
        } else {
            window.timetableRows = 12;
        }
    }
}


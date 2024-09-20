import * as parser from "./parser.js";
import * as utils from "./utils.js";
window.trainsSetBefore = [];
window.stationsSet = [];
window.station = '';
window.region = 'eu';
window.isDeparture = localStorage.getItem('isDeparture') === 'true';
window.isStopped = localStorage.getItem('isStopped') === 'true';
window.timetableSize = localStorage.getItem('timetableSize') || 'normal';
window.stopTypes = JSON.parse(localStorage.getItem('stopTypes')) || ['ph'];
window.trainTypes = JSON.parse(localStorage.getItem('trainTypes')) || ['EMRP'];
window.overlayName = localStorage.getItem('overlayName') || 'krakow';
window.showOperators = localStorage.getItem('showOperators') === 'true';
window.showHistory = localStorage.getItem('showHistory') === 'true';
window.refreshTime = localStorage.getItem('refreshTime') || 60;
window.timetablesAsJson = null;
window.oldTimetablesAsJson = null;
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
window.isFulfilled = false;
window.isTerminated = true;
window.isTimerOn = false;
window.timer = null;
window.dateFrom = new Date(new Date().getTime() - (new Date().getTimezoneOffset()*60*1000)).toISOString().slice(0, 10);
window.dateTo = utils.addDays(dateFrom, 1);
window.timetablesAPI = 'https://stacjownik.spythere.eu/api/getActiveTrainList';
window.activeStationsAPI = 'https://api.td2.info.pl/?method=getStationsOnline';
window.carsDataAPI = "https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/carsData.json"
window.stationAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/stationsData.json';
window.operatorsAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/operatorConvert.json';
window.namesCorrectionsAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/namesCorrections.json';
window.trainCategory = JSON.parse(localStorage.getItem('trainCategory')) ||
    [
        'EI', 'EC', 'EN',
        'MP', 'MH', 'MM', 'MO',
        'RP', 'RA', 'RM', 'RO',
        'TC', 'TG', 'TR', 'TD', 'TM', 'TN', 'TK', 'TS',
        'LP', 'LT', 'LS'
    ];

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
    operatorsRequest = parser.makeAjaxRequest(operatorsAPI, 'operatorsAsJson').then();

    carsDataRequest = parser.makeAjaxRequest(carsDataAPI, 'carsDataAsJson').then(() => {
            if (overlayName === 'plakat') {
                $(`#timetables-cycle`).text(carsDataAsJson['timetables-cycle']);
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
                refreshTimetables();
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
                if (checkpoint.includes('MAZ') && !checkpoint.split('MAZ')[1].includes('.')) { //temporary for TOMASZÓW & GRODZISK
                    checkpoint += '.';
                }
                window.station = checkpoint
            }
            if (urlParams.get('region') !== null) {
                switch (urlParams.get('region').toUpperCase()) {
                    case 'PL2':
                    case 'CAE':
                        window.region = 'cae';
                        break;
                    case 'DE':
                    case 'USW':
                        window.region = 'usw';
                        break;
                    case 'US':
                    case 'CZ':
                        window.region = 'us';
                        break;
                    default:
                        window.region = 'eu';
                        break;
                }
                $('#td2-region').val(region);
            }
        }
    });

    let timetableDate = $('#timetable-date');
    timetableDate.val(dateFrom);

    timetableDate.change(function() {
        window.dateFrom = timetableDate.val();
        window.dateTo = utils.addDays(dateFrom, 1);
        refreshTimetables();
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

    $('#timer-button').mousedown(function () {
        let timerButton = $('#timer-button');

        if (timerButton.html() === 'timer_off') {
            timerButton.html('timer');
            window.timer = setInterval(() => {
                $('#type-button').mousedown();
            }, refreshTime*1000);
            window.isTimerOn = true;
        } else {
            timerButton.html('timer_off');
            clearInterval(timer);
            window.isTimerOn = false;
        }
    });

    $('#fullscreen-button').mousedown(function () {
        if (document.fullscreenElement) {
            document.exitFullscreen().then();
        } else {
            document.documentElement.requestFullscreen().then();
        }
    });

    $('#sceneries').change(function() {
        parser.refreshCheckpointsList();
        window.station = $('#checkpoints option').val();
        refreshTimetables();
    });

    $('#checkpoints').change(function(){
        window.station = $(this).val();
        refreshTimetables();
    });

    $('#timetable-size').change(function() {
        if (overlayName !== 'krakow') { return; }
        window.timetableSize = $(this).val();
        localStorage.timetableSize = timetableSize;
        toggleSize();
    });

    $('#td2-region').change(function() {
        window.region = $(this).val();
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

    $('.refresh-time').mousedown(function() {
        let switchId = $(this).attr('id');
        $('.refresh-time').removeClass('active');
        $(this).addClass('active');
        window.refreshTime = switchId.replace('s', '');
        localStorage.refreshTime = refreshTime;
    });

    $('.train-type').mousedown(function() {
        utils.purgeTimetablesTable(['plakat', 'wyciag'])
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
        utils.purgeTimetablesTable(['plakat', 'wyciag'])
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
        toggleButton($(this), isStopped);
    });

    $('#toggle-operators').mousedown(function() {
        utils.purgeTimetablesTable(['plakat', 'wyciag'])
        window.showOperators = !showOperators;
        localStorage.showOperators = showOperators;
        toggleButton($(this), showOperators);
    });

    $('#toggle-history').mousedown(function() {
        window.showHistory = !showHistory;
        localStorage.showHistory = showHistory;
        utils.purgeTimetablesTable();
        toggleButton($(this), showHistory);
    });

    $('#toggle-fulfilled').mousedown(function() {
        utils.purgeTimetablesTable();
        window.isFulfilled = !isFulfilled;
        toggleButton($(this), isFulfilled);
    });

    $('#toggle-terminated').mousedown(function() {
        utils.purgeTimetablesTable();
        window.isTerminated = !isTerminated;
        toggleButton($(this), isTerminated);
    });

    $('#reset-filter').mousedown(function() {
        localStorage.removeItem('stopTypes');
        localStorage.removeItem('trainTypes');
        localStorage.removeItem('trainCategory');
        localStorage.removeItem('isStopped');
        window.stopTypes = ['ph'];
        window.trainTypes = ['EMRP'];
        window.trainCategory =     [
            'EI', 'EC', 'EN',
            'MP', 'MH', 'MM', 'MO',
            'RP', 'RA', 'RM', 'RO',
            'TC', 'TG', 'TR', 'TD', 'TM', 'TN', 'TK', 'TS',
            'LP', 'LT', 'LS'
        ];
        window.isStopped = false;
        window.showOperators = false;
        window.showHistory = false;
        initzializeMenu();
        loadTimetables();
    });

    $(document).bind('keydown', (e) => {
        switch (e.which) {
            case 121:
                e.preventDefault();
                $('#button-box').toggleClass('hidden');
            break;
            case 71:
                e.preventDefault();
                $('#timer-button').mousedown();
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

    let timetableSize = $('#timetable-size');
    if (overlayName !== 'krakow') {
        timetableSize.val('normal');
        timetableSize.prop('disabled', true);
        localStorage.timetableSize = 'normal';
        window.timetableSize = 'normal';
    } else {
        timetableSize.prop('disabled', false);
    }

    setRowsCount();
    utils.resizeTimetableRow();
}

function toggleButton(button, condition) {
    if (condition) {
        button.addClass('active');
    } else {
        button.removeClass('active');
    }
    loadTimetables();
}

function toggleSize() {
    if (overlayName !== 'krakow') { return; }
    let timetables = $('#timetables');
    let labels = $('#headers');
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
    let closeBox = $('#close-box');

    closeBox.toggleClass('active');
    $('#menu-button').toggleClass('fill');

    if (menuBox2.hasClass('popup')) {
        menuBox2.toggleClass('popup');
    }
    else {
        menuBox.toggleClass('popup');
    }
}

function switchMenuPage() {
    $('#menu-box').toggleClass('popup');
    $('#menu-box-2').toggleClass('popup');
}

function refreshTimetables() {
    if (showHistory && region === 'eu' || oldTimetablesAsJson === null) {
        window.oldTimetablesAPI = `https://stacjownik.spythere.eu/api/getTimetables?countLimit=500` +
                                    //`&terminated=${+isTerminated}` +
                                    //`&fulfilled=${+isFulfilled}` +
                                    `&includesScenery=${$('#sceneries').val()}` +
                                    `&dateFrom=${dateFrom}` +
                                    `&dateTo=${dateTo}`;
        parser.makeAjaxRequest(oldTimetablesAPI, 'oldTimetablesAsJson').then(() => {
                createTimetablesInterval();
            }
        );
    } else {
        createTimetablesInterval();
    }
}

function createTimetablesInterval() {
    clearInterval(timetableInterval);
    utils.purgeTimetablesTable();
    loadTimetables();
    document.title = `${utils.capitalizeFirstLetter(station)} - Tablice Zbiorcze`
    window.timetableInterval = setInterval(function() {
        loadTimetables();
        parser.refreshSceneriesList();
    }, 30000);

    let sceneries = $('#sceneries');
    let url = new URL(window.location.href);
    if (sceneries.val() !== null) {
        url.searchParams.set('station', sceneries.val());
        if ($('#checkpoints').val() !== sceneries.val()) {
            url.searchParams.set('checkpoint', station.replace(/\.$/, ''));
        } else {
            url.searchParams.delete('checkpoint');
        }
    }
    window.history.replaceState(null, null, url.href);
}

export function loadTimetables() {
    let trainsSetBefore = window.trainsSetBefore;
    let trainSet = parser.parseTimetable();
    if (trainSet === undefined) { return; }
    let trainsNew = trainSet.filter(m => !trainsSetBefore.map(n => n.trainNo).includes(m.trainNo));
    let trainsToRemove = trainsSetBefore.filter(m => !trainSet.map(n => n.trainNo).includes(m.trainNo));
    if (trainsSetBefore.length === 0 && trainSet.length > 0 || $('#timetables > table > tbody > tr').length === 0) {
        trainSet.forEach((train, index) => {
            $('#timetables > table').append(utils.addRow(train, index));
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
                let row = utils.addRow(train, index);
                if (index === 0) {
                     $('#timetables > table').prepend(row);
                } else {
                    $(`#${index-1}`).after(row);
                }
                utils.refreshIds();
            });
        }
    }
    trainSet.forEach((train, index) => {
        let stopsList = [];
        let stopPointTime = '';
        let lastStopPoint = '';
        let remark = utils.createRemark(
                train.delay,
                train.beginsTerminatesHere,
                train.stoppedHere
        );

        if (overlayName !== 'plakat') {
            if (train.trainName !== '') {
                if (overlayName === 'starysacz') {
                    train.trainName = `󠀠󠀠••• <b><i>${train.trainName}</i></b> •••󠀠󠀠󠀠󠀠${remark.replace('•', '')}`;
                }
                else { train.trainName = `*** ${train.trainName.toUpperCase()} *** ${remark}`; }
            } else {
                train.trainName = remark;
            }
        }

        train.timetable.forEach((stopPoint) => {
            if (lastStopPoint === stopPoint.stopPoint) { return; }
            lastStopPoint = stopPoint.stopPoint;
            stopPoint.stopPoint = stopPoint.stopPoint.replace(/ /g, '\u202F\u202F').replace('-', '\u2011');

            if (overlayName === 'plakat') {
                if (isDeparture) {
                    stopPointTime = stopPoint.arrivalAt;
                } else {
                    stopPointTime = stopPoint.departureAt;
                }

                if (stopPoint.isShunting) {
                    stopsList.push(`<b>${stopPoint.stopPoint}&nbsp;${stopPointTime}</b>`);
                } else {
                    stopsList.push(`${stopPoint.stopPoint}&nbsp;${stopPointTime}`);
                }
            } else {
                    stopsList.push(`${stopPoint.stopPoint}`);
            }
        });

        stopsList = stopsList.join(', ');

        if (overlayName !== 'plakat') {
            $(`#${index} td:nth-child(4) span`)
                .text(stopsList);
        }

        let trainCatNo = $(`#${index} td:nth-child(2) span`);
        let trainName = $(`#${index} td:nth-child(3) .indented span`);
        let extraSymbols = '';
        let extra = '';

        if (train.trainName === 'specjalny-1') {
            train.trainName = '';
            extra = `Przejazd tylko do stacji ${train.stationTo}. Niedostępny w sprzedaży dla wysiadających na stacjach pośrednich.`;
            extraSymbols = `<span class="material-symbols-outlined">calendar_month</span> ${utils.createDate(false, false)};`;
        }

        switch (overlayName) {
            case 'tomaszow':
                trainCatNo.text(`${train.category} ${train.trainNo}`);

                $(`#${index} td:nth-child(5)`).text(train.operator);
                $(`#${index} td:nth-child(7) span`).text(train.trainName);
                break;
            case 'krakow':
                trainName.text(train.trainName);

                $(`#${index} td:nth-child(1) span:last-child`).text(`${train.category} ${train.trainNo}`);
                $(`#${index} td:nth-child(2)`).text(train.operator);
                break;
            case 'starysacz':
                trainCatNo.html(`${train.category} ${train.trainNo}`);

                $(`#${index} td:nth-child(2) p`)
                    .html(train.operator);

                if (train.trainName === '') {
                    $(`#${index} td:nth-child(3)`).css('vertical-align', `middle`);
                    $(`#${index} td:nth-child(3) .indented`).css('display', `none`);
                }

                trainName.html(train.trainName);
                break;
            case 'plakat':
                if (train.category) {
                    train.category = ` - ${train.category}`;
                }

                $(`#${index} td:nth-child(3) .train-category`).text(train.operator).append($('<b>').text(train.category));
                $(`#${index} td:nth-child(3) .train-name`).html(train.trainName.toUpperCase());

                if (isDeparture) {
                    if (stopsList !== '') { stopsList += ','; }
                    $(`#${index} .fromTo .departure`)
                        .text(train.stationFromTo + ' ' + train.arrivalAt);
                } else {
                    stopsList = `<span class="text-bold">${train.stationFromTo} ${train.departureAt}</span>, ${stopsList}`
                }

                $(`#${index} .extra-symbols`).html(extraSymbols);
                $(`#${index} .extra`).html(extra);

                $(`#${index} .fromTo .stop-list`).html(stopsList);
                break;
        }
    });

    let titleScenery = $(`#title-scenery`);
    let updateDate = $(`#update-date`);

    switch (overlayName) {
        case 'plakat':
            updateDate.text(`Aktualizacja wg stanu na ${utils.createDate()}`);
            titleScenery.html(utils.capitalizeFirstLetter(station.split(',')[0]));
            $(`#timetables-cycle`).text(carsDataAsJson['timetables-cycle']);
            break;
        case 'wyciag':
            updateDate.text(`${utils.createDate(true)}`);
            titleScenery.html(utils.capitalizeFirstLetter(station.split(',')[0]));
            $(`#title-scenery-bold`).html(station.split(',')[0].toUpperCase());
            break;
    }

    if (timetableRows > 0) {
        for (let i = timetableRows; i < trainSet.length; i++) {
            $(`#${i}`).remove();
        }
    }

    resizeTextToFit();
    refreshTimetablesAnim();
    utils.resizeTimetableRow();
}

function resizeTextToFit() {
    $('.train-name').each(function() {
        let trainNameFontSize = parseInt($(this).css('font-size'));
        let parentWidth = $(this).parent().width();

        while ($(this).width() > parentWidth) {
            trainNameFontSize = trainNameFontSize - 0.1;
            $(this).css('font-size', `${trainNameFontSize}vmin`);
        }
    });
}

export function refreshTimetablesAnim() {
    let tr = $('#timetables > table > tbody > tr');
    let td, span, animDuration, fieldWidth, widthRatio, tdWidth;
    if (overlayName === ('plakat' || 'wyciag')) { return; }
    if (overlayName === 'starysacz') { widthRatio = 1; }
    else { widthRatio = 0.9; }

    for (let i = 0; i < tr.length; i++) {
        td = $(tr[i]).find('td');
        tdWidth = $(td[2]).width() + $(td[3]).width();
        if (i >= timetableRows) { return; }
        for (let j = 0; j < td.length; j++) {
            span = $(td[j]).find('span');
            if (span.text().length <= 0) { continue; }
            for (let k = 0; k < span.length; k++) {
                fieldWidth = $(td[j]).width();
                if ($(td[j]).find('.indented span').text().length > 0 && overlayName === 'starysacz') {
                    $(td[j]).find('.indented').css('position', 'fixed');
                    $(td[j+1]).css('vertical-align', 'top');
                    $(td[j+1]).css('padding', '1vmin 0');
                    fieldWidth = $(td[j]).width() + $(td[j+1]).width();
                }

                animDuration = (($(span[k]).width() + fieldWidth) * 10) / 400;

                if ($(span[k]).css('animation-duration') !== animDuration) {
                    if ($(span[k]).width() > fieldWidth*widthRatio) {
                        $(span[k]).css('animation', `ticker linear ${animDuration}s infinite`);
                        $(span[k]).css('--elementWidth', fieldWidth+"px");
                    } else {
                        $(span[k]).css('animation', '');
                    }
                }
            }
        }
    }
}

function changeBoardType() {
    let texts = {};
    let body = $('body');
    let container = $('#container');
    let timetables = $('#timetables > table > tbody');
    let headers = $('#headers table');
    let updateDate = $(`#update-date`);
    timetables.find('tr').remove();

    switch (overlayName) {
        case 'krakow':
        case 'tomaszow':
        case 'starysacz':
            if (isDeparture) {
                texts.titlePL = 'Odjazdy';
                texts.titleEN = 'Departures';
                texts.desc = 'Do<br><i>Destination</i>';
                container.attr('class', 'yellow-text');
            } else {
                texts.titlePL = 'Przyjazdy';
                texts.titleEN = 'Arrivals';
                texts.desc = 'Z<br><i>From</i>';
                container.attr('class', 'white-text');
            }

            $('.title-pl').text(texts.titlePL);
            $('.title-en').text(texts.titleEN);
            if (overlayName !== 'starysacz') {
                $('#headers table th:nth-child(3)').html(texts.desc);
            }
            break;
        case 'plakat':
            headers = $('#timetables > table > thead');
            updateDate.text(`Aktualizacja wg stanu na ${utils.createDate()}`);
            if (isDeparture) {
                texts.type = '<b>Odjazdy</b> <i>/ Departures / Відправлення</i>';
                texts.desc1PL = 'godzina odjazdu';
                texts.desc1EN = 'departure time';
                texts.desc2PL = 'godziny przyjazdów do stacji pośrednich';
                texts.desc2EN = 'arrivals at intermediate stops';
                body.addClass('yellow-bg');
                headers.addClass('yellow-bg');
                timetables.addClass('yellow-bg');

            } else {
                texts.type = '<b>Przyjazdy</b> <i>/ Arrivals / Прибуття</i>';
                texts.desc1PL = 'godzina przyjazdu';
                texts.desc1EN = 'arrival time';
                texts.desc2PL = 'godziny odjazdów ze stacji pośrednich';
                texts.desc2EN = 'departures from intermediate stops';
                body.removeClass();
                timetables.removeClass();
                headers.removeClass();
            }

            $('#title-type').html(texts.type);
            headers.find('td:nth-child(1) .header-pl').html(texts.desc1PL);
            headers.find('td:nth-child(1) .header-en').html(texts.desc1EN);
            headers.find('td:nth-child(4) .header-pl').html(texts.desc2PL);
            headers.find('td:nth-child(4) .header-en').html(texts.desc2EN);

            if (isTimerOn) {
                $('#timer-button').mousedown();
            }
            break;
        case 'wyciag':
            updateDate.text(`${utils.createDate(true)}`);
            if (isDeparture) {
                $("#type-button").mousedown();
            }

            if (isTimerOn) {
                $('#timer-button').mousedown();
            }
            break;
    }

    if (overlayName === 'starysacz') {
        texts.desc1 = '<i><b>Stacja początkowa, dodatkowe informacje</b><br>Origin, additional information</i>';

        if (isDeparture) {
            texts.type = '<b>Odjazdy</b> <i>/ Departures / Відправлення</i>';
            texts.desc1PL = 'Godzina odjazdu';
            texts.desc1EN = 'Time of departure';
            texts.desc2PL = 'Stacja docelowa, dodatkowe informacje';
            texts.desc2EN = 'Destination, additional information';
        } else {
            texts.type = '<b>Przyjazdy</b> <i>/ Arrivals / Прибуття</i>';
            texts.desc1PL = 'Godzina przyjazdu';
            texts.desc1EN = 'Time of arrival';
            texts.desc2PL = 'Stacja początkowa, dodatkowe informacje';
            texts.desc2EN = 'Origin, additional information';
        }

        headers.find('th:nth-child(1) .header-pl').html(texts.desc1PL);
        headers.find('th:nth-child(1) .header-en').html(texts.desc1EN);
        headers.find('th:nth-child(3) .header-pl').html(texts.desc2PL);
        headers.find('th:nth-child(3) .header-en').html(texts.desc2EN);
    }
}

function initzializeMenu () {
    $(`.train-type`).removeClass('active');
    $(`.stop-type`).removeClass('active');
    $(`.train-category`).removeClass('active');

    $(`#${refreshTime}s`).addClass('active');

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
    toggleButton($('#toggle-operators'), showOperators);
    toggleButton($('#toggle-stop'), isStopped);
    toggleButton($('#toggle-history'), showHistory);
    toggleButton($('#toggle-fulfilled'), isFulfilled);
    toggleButton($('#toggle-terminated'), isTerminated);
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

    if (overlayName !== 'krakow') {
        $('#timetable-size').prop('disabled', true);
    }
}

function setRowsCount() {
    if (overlayName === 'plakat' || overlayName === 'wyciag') {
        window.timetableRows = 0;
        return;
    }

    if (timetableSize === 'normal') {
        window.timetableRows = 10;
    } else {
        window.timetableRows = 6;
    }

    if (overlayName === 'starysacz') {
        window.timetableRows = 7
    }
    if (overlayName === 'tomaszow') {
        window.timetableRows = 12;
    }
}


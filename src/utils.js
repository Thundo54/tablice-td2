//add it to api (to be able to make changes in the future)
import * as parser from "./parser.js";
import { loadTimetables } from "./timetables.js";

function correctNames(name) {
    for (let key in namesCorrectionsAsJson) {
        if (name.includes(key)) {
            return name.replace(key, namesCorrectionsAsJson[key]);
        }
    }
    return name;
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
    train.category = timetable['timetable']['category'];

    return train;
}

export function createRemark(delay = 0, beginsTerminatesHere, isStopped) {
    // Można dodać przełącznik który będzie pokazywał opóźnienie jeśli pociąg kończy bieg
    if (delay > 0) {
        if (isStopped) {
            return `Pociąg został zatrzymany na trasie/train has been stopped on route/der Zug wurde auf der Strecke angehalten`;
        } else {
            return `Opóźniony ${delay}min/delayed ${delay}min/verspätung ${delay}min`;
        }
        // if (trainNo !== 0) {
        //     console.log(`Zmieniono opóźnienie pociągu ${trainNo} na ${delay}min`);
        // }
    } else if (beginsTerminatesHere) {
        if (isDeparture) {
            return 'Pociąg rozpoczyna bieg/train begins here/zug beginnt hier';
        } else {
            return 'Pociąg kończy bieg/train terminates here/zug endet hier';
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

// export function addSpecialRow(row, content) {
//     $(`#timetables table tr:first-child`)
//         .after($('<tr>')
//             .append($('<td>').attr('colspan', 7)
//                 .append($('<div>').addClass('special-row')
//                     .append($('<p>').text(content)
//     ))));
//
//    // refreshTimetablesAnim();
// }

export function refreshIds() {
    let i = 0;
    $('#timetables table tr').each(function () {
        $(this).attr('id', i);
        i++;
    });
}

export function convertCategory(category) {
    //if (category.startsWith('E')) {
    //    return 'IC';
    //} else if (category.startsWith('M')) {
    //    return 'TLK';
    //} else {
    //    return 'R';
    //}
    return category;
}

export function convertTime(time) {
    return new Date(time).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'});
}

export function createTrainString(category, trainNo) {
    return convertCategory(category) + ' ' + trainNo;
}

window.loadTimetablesFromUrl = (url) => {
    clearInterval(timetableInterval);
    clearInterval(getTimetablesInterval);
    clearInterval(getActiveStationsInterval);
    window.timetablesAPI = url;
    parser.makeAjaxRequest(timetablesAPI, 'timetablesAsJson').then(() => loadTimetables());
}

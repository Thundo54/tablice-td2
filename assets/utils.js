export function capitalizeFirstLetter(string) {
    if (string === string.toUpperCase()) {
        let output = '';
        string.split(' ').forEach((element) => {
            output += element.charAt(0).toUpperCase() + element.slice(1).toLowerCase() + ' '
        });
        return output.slice(0, -1);
    } else {
        return string;
    }
}

export function splitRoute(string) {
    let stations = [];
    string.split('|').forEach((element) => {
        stations.push(capitalizeFirstLetter(element));
    });
    return stations;
}

export function createRemark(delay = 0, isDeparture, beginsTerminatesHere, isStopped) {
    // Można dodać przełącznik który będzie pokazywał opóźnienie jeśli pociąg kończy bieg
    if (delay > 0) {
        if (isStopped) {
            return `Pociąg został zatrzymany na trasie/train has been stopped on route/der Zug wurde auf der Strecke angehalten`;
        } else {
            return `Opóźniony o ${delay}min/delayed ${delay}min/verspätung ${delay}min`;
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

export function addRow(time, train, stationFromTo, via, operator, platform, remarks, rowNo) {
    let row = $('<tr>').attr('id', `${rowNo}`);
    row.append($('<td>').text(convertTime(time)));
    row.append($('<td>').append($('<div>').append($('<span>').text(createTrainString(operator, train)))));
    row.append($('<td>').append($('<span>').text(stationFromTo)));
    row.append($('<td>').append($('<span>').text(via)));
    row.append($('<td>').text(operator));
    row.append($('<td>').text(platform));
    row.append($('<td>').append($('<span>').text(remarks)));
    return row;
}

export function addSpecialRow(row, content) {
    $(`#timetables table tr:first-child`)
        .after($('<tr>')
            .append($('<td>').attr('colspan', 7)
                .append($('<div>').addClass('special-row')
                    .append($('<p>').text(content)
    ))));

   // refreshTimetablesAnim();
}

export function refreshIds() {
    let i = 0;
    $('#timetables table tr').each(function () {
        $(this).attr('id', i);
        i++;
    });
}

export function convertCategory(category) {
    if (category.startsWith('E')) {
        return 'IC';
    } else if (category.startsWith('M')) {
        return 'TLK';
    } else {
        return 'R';
    }
}

export function convertTime (time) {
    return new Date(time).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'});
}

export function createTrainString(category, trainNo) {
    return convertCategory(category) + ' ' + trainNo;
}
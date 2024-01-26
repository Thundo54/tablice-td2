window.carsDataAPI = "https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/carsData.json"
window.stationAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/stationsData.json';
window.operatorsAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/operatorConvert.json';
window.namesCorrectionsAPI = 'https://raw.githubusercontent.com/Thundo54/tablice-td2-api/master/namesCorrections.json';
window.carsDataAsJson = null;
window.stationDataAsJson = null;
window.operatorsAsJson = null;
window.namesCorrectionsAsJson = null;

$(document).ready(() => {
    let table;
    let dataSource;
    let tableBody = $('#table-body');
    let additionalInfo = $('#additional-info');

    makeAjaxRequest(carsDataAPI, 'carsDataAsJson').then();
    makeAjaxRequest(stationAPI, 'stationDataAsJson').then();
    makeAjaxRequest(operatorsAPI, 'operatorsAsJson').then();
    makeAjaxRequest(namesCorrectionsAPI, 'namesCorrectionsAsJson').then();

    $('input[name="switch-data"]').on('change', (e) => {
        let showPicker;
        tableBody.empty();
        additionalInfo.empty();
        $('#searched-number').text('');

        if (['carsData', 'operators'].includes(e.target.id)) {
            showPicker = true;
        }

        dataSource = window[`${e.target.id}AsJson`];

        if (showPicker) {
            createJsonTablePicker(dataSource)
        } else {
            $('#table-picker').attr('hidden', '');
            table = ''; // sprawdz czy to jest potrzebne
            tableBody.append(createJsonTable(dataSource));
            $('#search').trigger('keyup');
        }
    });

    $('#table-pick').on('change', (e) => {
        table = e.target.value;
        tableBody.empty();
        additionalInfo.empty();
        tableBody.append(createJsonTable(dataSource[table]));
        searchForDuplicates(dataSource[table], table);
        $('#search').trigger('keyup');
    })

    $('#search').on('keyup', (e) => {
        let searchedNumber = 0;
        $('#table-body > table > tr').each((index, tr) => {
            let found = false;
            let selector = '.value';

            $(tr).find('mark').each((index, mark) => {
                $(mark).replaceWith($(mark).text());
            });

            if (['operators', 'symbols'].includes(table)) { selector += ', .key'; }

            $(tr).find(selector).each((index, td) => {
                if (/"(.*?)"/g.exec(e.target.value) && $(td).text() === e.target.value.replace(/"/g, '')
                || $(td).text().toLowerCase().includes(e.target.value.toLowerCase())) {
                    found = true;
                    if (e.target.value !== '') { searchedNumber++;  console.log(e.target.value);}
                    $(td).html($(td).text().replace(new RegExp(e.target.value.replace(/"/g, ''), 'gi'), `<mark>$&</mark>`));
                }
            });

            if (found) {
                $(tr).removeAttr('hidden');
            } else {
                $(tr).attr('hidden', '');
            }
        });

        if (searchedNumber === 0) {
            searchedNumber = $('#table-body > table > tr:not([hidden])').length;
        }

        switch (searchedNumber) {
            case 0:
                searchedNumber = '';
                break;
            case 1:
                searchedNumber = `(${searchedNumber} wynik)`;
                break;
            case 2: case 3: case 4:
                searchedNumber = `(${searchedNumber} wyniki)`;
                break;
            default:
                searchedNumber = `(${searchedNumber} wyników)`;
        }

        $('#searched-number').text(`${searchedNumber}`);
    });
});

function searchForDuplicates(jsonData, table) {
    let trainsNo = {};
    let searchKey = 'trainNo';

    if (table === 'overwrite') { searchKey = 'trainNoStartsWith'; }
    if (['trainNames', 'overwrite'].includes(table)) {
        for (let key in jsonData) {
            for (let trainNo in jsonData[key][searchKey]) {
                if (!trainsNo[jsonData[key]['operator']]) {
                    trainsNo[jsonData[key]['operator']] = [];
                }
                trainsNo[jsonData[key]['operator']].push(jsonData[key][searchKey][trainNo]);
            }
        }
    }

    for (let key in trainsNo) {
        let duplicates = [];
        let allData = [];
        for (let trainNo in trainsNo[key]) {
            if (allData.includes(trainsNo[key][trainNo])) {
                duplicates.push(trainsNo[key][trainNo]);
            } else if (isNumber(trainNo)) {
                allData.push(trainsNo[key][trainNo]);
            }
        }
        if (duplicates.length > 0) {
            duplicates.sort((a, b) => { return a - b });
            let duplicate = $('<p>').addClass('red');
            duplicate.html(`<b><i>${key}</i> zawiera duplikaty:</b></br> ${duplicates.join(', ')}`);
            $('#additional-info').append(duplicate);
        }
    }
}

function createJsonTablePicker(jsonData) {
    $('#table-picker').removeAttr('hidden');
    let tablePick = $('#table-pick');
    tablePick.empty();
    for (let key in jsonData) {
        let label = $('<label>');
        label.append($('<span>').text(key));
        label.append($(`<input type="radio" name="switch-table" value="${key}"/>`));
        tablePick.append(label);
    }
}

function createJsonTable(jsonData) {
    let table = $('<table>')

    if (typeof jsonData === 'string') {
        table = $('<p>').text(jsonData);
    } else {
        for (let key in jsonData) {
            let tr = $('<tr>');
            let keyName = $('<td>');
            let valueName = $('<td>');
            keyName.text(key).addClass('key');

            if (typeof jsonData[key] === 'object') {
                valueName.append(createJsonTable(jsonData[key]));
            }
            else {
                if (jsonData[key] === '') { jsonData[key] = '‎';}
                if (key === 'trainName' || key === 'remarks') {
                    valueName.addClass('italic');
                }
                valueName.addClass('value').text(jsonData[key]);
            }

            if (isNumber(key)) {
                keyName.text(parseInt(key)+1);
            }

            tr.append(keyName).append(valueName);
            table.append(tr);
        }

        if (table.children().length === 0) {
            table = $('<p>').text('‎');
        }
    }

    return table;
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function makeAjaxRequest(url, variableName) {
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
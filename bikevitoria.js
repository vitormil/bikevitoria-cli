#!/usr/bin/env node

const program = require('commander');
const http = require('http');
const util = require('util');
const vm = require('vm');
const cliff = require('cliff');

var stations = [];

program
  .version('0.0.1')
  .option('-s, --station [ids comma-separated]', 'Filter by station(s)')
  .option('-A, --all', 'List all stations (force)')
  .parse(process.argv);

const buildStation = function (raw) {
  return {
    'id': raw[12],
    'name': raw[0],
    'bikes': parseInt(raw[8]),
    'freePositions': parseInt(raw[9]),
    'image': raw[11]
  }
};

const twoDigitsStr = function (intValue) {
  return intValue.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false});
};

const showStation = function (station) {
  return program.all ||
    typeof(program.station) == 'undefined' ||
    (',' + program.station + ',').indexOf(',' + station.id + ',') != -1;
};

const isStationOffline = function (station) {
  return station.image.indexOf('offline') != -1;
};

const prepareRow = function(station) {
  var row = [station.id, station.name, twoDigitsStr(station.bikes) + ' of ' + twoDigitsStr(station.bikes + station.freePositions)];

  if (station.bikes == 0) {
    row[1] = row[1].red
    row[2] = row[2].red
  } else {
    row[2] = row[2].green
  }

  if (station.bikes == (station.freePositions + station.bikes)) {
    row[1] = row[1].rainbow
  }

  if (isStationOffline(station)) {
    row[1] = row[1] + ' (offline)'.red
  }

  return row;
};

const printStations = function () {
  var station;
  var rows = [
    ['Station'.bold.inverse, 'Name'.bold.inverse, 'Bikes available'.bold.inverse]
  ];

  for (var i = 0; i < stations.length; i++) {
    station = stations[i];

    if (showStation(station)) {
      rows.push(prepareRow(station));
    }
  }

  console.log(cliff.stringifyRows(rows));
}

http.get({
  host: 'www.bikevitoria.com',
  path: '/mapaestacao.aspx'
}, function(response) {
    var body = '';
    response.on('data', function(d) {
        body += d;
    });
    response.on('end', function() {
        var pattern = /var (beaches = .*);\/\/]]>/g;
        var match = pattern.exec(body);

        var sandbox = {beaches: []};

        const script = new vm.Script(match[1]);
        const context = vm.createContext(sandbox);
        script.runInContext(context);

        context.beaches.forEach(function (station) {
          stations.push(buildStation(station));
        });

        printStations();
    });
}).on('error', (e) => {
  if (e.errno && e.errno === 'ENOTFOUND') {
    console.error('There is no Internet connection.');
  } else {
    console.error(e)
  }
});

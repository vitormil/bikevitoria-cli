#!/usr/bin/env node

const program = require('commander');
const http = require('http');
const util = require('util');
const vm = require('vm');
const cliff = require('cliff');

var stations = [];

program
  .version('0.0.1')
  .option('-s, --station [id]', 'Filter by station number')
  .parse(process.argv);

const buildStation = function (raw) {
  return {
    'id': raw[12],
    'name': raw[0],
    'bikes': parseInt(raw[8]),
    'freePositions': parseInt(raw[9])
  }
};

const twoDigitsStr = function (intValue) {
  return intValue.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
};

const printStations = function () {
  var rows = [
    ['Station'.bold.inverse, 'Name'.bold.inverse, 'Bikes available'.bold.inverse]
  ];

  stations.forEach(function (station) {
    if (program.station && station.id != program.station) {
      return
    }
    const row = [station.id, station.name, twoDigitsStr(station.freePositions) + ' of ' + twoDigitsStr(station.bikes + station.freePositions)];

    if (station.freePositions == 0) {
      color = 'red';
    } else {
      color = 'green';
    }
    row[2] = row[2][color]

    rows.push(row);
  });

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
        const context = new vm.createContext(sandbox);
        script.runInContext(context);

        context.beaches.forEach(function (station) {
          stations.push(buildStation(station));
        });

        printStations();
    });
});

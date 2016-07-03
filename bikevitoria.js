#!/usr/bin/env node

const program = require('commander');
const http = require('http');
const util = require('util');
const vm = require('vm');
var stations = [];

program
  .version('0.0.1')
  .option('-s, --station [id]', 'Filter by station number')
  .parse(process.argv);

const buildStation = function (raw) {
  return {
    'id': raw[12],
    'name': raw[0],
    'bikes': raw[8],
    'freePositions': raw[9]
  }
};

const printStations = function () {
  stations.forEach(function (station) {
    if (program.station && station.id != program.station) {
      return
    }
    console.log(station.id + ' - ' + station.name + ' Bikes: ' + station.bikes + ' Free: ' + station.freePositions);
  });
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
});

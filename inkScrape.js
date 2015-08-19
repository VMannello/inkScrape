var request = require('request');   //Makes requests easy
var cheerio = require('cheerio');   //JQ for NJS
var fs = require('fs');             //File handling
var _ = require('underscore');      //General Utility, by general I mean magic
var moment = require('moment');     //Times and such
var csv = require('csv');           //CSV parser, probably heavy for my needs right now...

var printerURL = [
    ["FB1", "http://192.168.1.105/"],
    ["FB2", "http://192.168.1.106/"],
    ["FB3", "http://192.168.1.250/"]
];

var dateRange = "July"; //Set up for full month pulls

var doWork = function(eM, iM, lM) {
    var urlArray = [];
    var jobArray = [
        ['Job Name', 'Copies Printed', 'Sq. In / Copy', 'Total Sq. In', 'Total Print Time', 'Cyan Ink', 'Magenta Ink', 'Yellow Ink', 'Black Ink', 'Light Cyan Ink', 'Light Magenta Ink', 'White Ink', 'Total CMYKcm', 'Total (+ White)', 'Profile']
    ];

    var xI = 0;
    var dated, csved;

    function cb() {
        xI++;

        if (xI == dated.length) {
            _.each(jobArray, function(e, i, l) {
                jobArray[i] = e.join(',');
            });
            csved = jobArray.join('\n');

            fs.writeFile(eM[0] + '-inkUsage-' + moment() + '.csv', csved, function(err) {
                if (err) throw err;
                console.log('CSV Out!');
            });
        }
    }

    var download = function(url, i, l) {

        function totalsqIn(sqIn, copies) {
            if (copies >= 1) {
                return (sqIn * copies);
            } else {
                return sqIn;
            }
        }

        function getNum(str) {
            var e = str.split(' ', 1);
            return parseFloat(e);
        }

        function realTime(time) {
            if (time > 2880) {
                time = 'N/A';
            }
            return time;
        }

        request(url[1], function(err, response, html) {
            if (!err) {
                csv.parse(html, function(err, d) {
                    if (err) {
                        console.log(err);
                    } else {
                        jobArray.push([d[1][1], getNum(d[5][1]), getNum(d[11][1]), totalsqIn(getNum(d[11][1]), d[5][1]), realTime(getNum(d[15][1])), getNum(d[24][1]) * 0.001, getNum(d[25][1]) * 0.001, getNum(d[26][1]) * 0.001, getNum(d[23][1]) * 0.001, getNum(d[27][1]) * 0.001, getNum(d[28][1]) * 0.001, getNum(d[29][1]) * 0.001, (getNum(d[24][1]) + getNum(d[25][1]) + getNum(d[26][1]) + getNum(d[23][1]) + getNum(d[27][1]) + getNum(d[28][1])) * 0.001, (getNum(d[24][1]) + getNum(d[25][1]) + getNum(d[26][1]) + getNum(d[23][1]) + getNum(d[27][1]) + getNum(d[28][1]) + getNum(d[29][1])) * 0.001, d[16][1]]);
                        cb();
                    }
                });

            }

            if (err) {
                console.log("Retrying " + url[1] + err);
                download(url);
            }
        });
    };

    request(eM[1] + 'account.cgi', function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);
            $('.pad0x10').find('a').each(function(i, elem) {
                var test = elem.attribs.href.split("?");
                if (test[0] === 'jobaccnt.cgi') {
                    urlArray.push([moment(elem.children[0].data), eM[1] + "jobaccnt.csv?" + test[1]]);
                }
            });

            dated = _.filter(urlArray, function(i) {
                return moment(i[0]).isSame(moment(dateRange, 'MMMM'), 'month');
            });

            _.each(dated, download);

        } else {
            console.log("Failed to connect to " + em[0]);
        }
    });

};

_.each(printerURL, doWork);

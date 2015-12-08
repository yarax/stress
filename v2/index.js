var fe = require('./frontend');
var Nnb = require('nnb');
var async = require('async');

var concStairs = [200];

var req = function (concurrency, callback) {
    var step = concStairs.indexOf(concurrency);
    var nnb = new Nnb({
        url: 'http://google.com/',
        concurrency: concurrency
    });
    var t1 = Date.now();
    //console.log("BEFORE);
    nnb.go(function (err, results) {
        var report = {};
        report.max = results.reduce(function (prev, item) {
            if (item.time > prev) return item.time;
            else return prev;
        }, -Infinity);
        report.min = results.reduce(function (prev, item) {
            if (item.time < prev) return item.time;
            else return prev;
        }, Infinity);
        var sum = results.reduce(function (prev, item) {
            return prev + item.time;
        }, 0);
        report.avg = sum / results.length;
        console.log(results, report);
        fe.emit('data', {
            aggregated: report,
            step: step
        });
        console.log("AFTER", t1 - Date.now());
        callback();
    });
};

fe.on("connected", function () {
    async.eachSeries(concStairs, req, function () {
        console.log('DONE');
    });
});

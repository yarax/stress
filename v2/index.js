var fe = require('./frontend');
var Nnb = require('nnb');
var async = require('async');
var config = require('../configs/default.json');

var concurrency = config.concurrency;
var step = 0;

var Report = function () {
    this.startTime = Date.now();
};

Report.prototype.generate = function (requestsNumber, results) {
    step++;
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

    var time = Date.now() - this.startTime;
    var rps = requestsNumber / (time / 1000);

    //console.log(results, report);
    fe.emit('data', {
        rps: rps,
        aggregated: report,
        step: requestsNumber
    });
};

var req = function (requestsNumber, callback) {
    var nnbCalls = Math.floor(requestsNumber / concurrency);
    var mod = requestsNumber % concurrency;

    async.eachSeries(new Array(nnbCalls).fill(0), function (_, next) {
        var report = new Report();
        concReq(concurrency, function (err, results) {
            report.generate(concurrency, results);
            setTimeout(next, 1000);
        });
    }, function (err) {
        if (err || !mod) {
            return callback(err);
        }
        var report = new Report();
        concReq(mod, function (err, results) {
            report.generate(mod, results);
            callback();
        });
    });
};

var concReq = function (concurrency, callback) {
    var nnb = new Nnb({
        url: config.tasks[0].request.url,
        concurrency: concurrency
    });
    nnb.go(callback);
};

fe.on("connected", function () {
    var conf = config.tasks[0].attack;
    if (conf.type === 'step') {
        if (conf.to < conf.from) {
            throw new Error('"To" is less than "from", please fix the config file');
        }
        var stepsCount;
        if (conf.step === 0) {
            stepsCount = 1;
        } else {
            stepsCount = parseInt((conf.to - conf.from) / conf.step);
        }
        var concStairs = new Array(stepsCount).fill(0).map(function (_, i) {
            return conf.from + conf.step * i;
        });
    }
    async.eachSeries(concStairs, req, function () {
        console.log('DONE');
    });
});

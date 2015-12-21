var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');

function MapReducer() {}

util.inherits(MapReducer, EventEmitter);

/**
 * Implements structure: {time, }
 * @returns {{requests: *, rps: number, aggregated: {}, step: *}}
 */
MapReducer.prototype.reduceRequests = function (results, startTime) {
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
    report.avg = Math.round(sum / results.length);

    var time = Date.now() - startTime;
    var rps = Math.round(results.length / (time / 1000));
    report.requests = results.length;

    //console.log(results, report);
    return {
        rps: rps,
        aggregated: report
    };
};

MapReducer.prototype.reduceAggregated = function (results, startTime) {
    var report = {};
    var max = results.reduce(function (prev, item) {
        if (item.aggregated.max > prev) return item.aggregated.max;
        else return prev;
    }, -Infinity);
    var min = results.reduce(function (prev, item) {
        if (item.aggregated.min < prev) return item.aggregated.min;
        else return prev;
    }, Infinity);
    var requests = results.reduce(function (prev, item) {
        return prev + item.aggregated.requests;
    }, 0);
    var avg = Math.round(results.reduce(function (prev, item) {
        return prev + item.aggregated.avg;
    }, 0) / results.length);

    var time = Date.now() - startTime;
    var rps = requests / (time / 1000);

    return {
        rps: rps,
        aggregated: {
            max: max,
            min: min,
            avg: avg,
            requests: requests
        }
    };
};

MapReducer.prototype.mapProcesses = function (parent, instances, totalNum, callback) {
    console.log('Total to send', totalNum);
    var alLeastForEach = Math.floor(totalNum / instances.length);
    var mod = totalNum % instances.length;
    var self = this;
    var results = [];
    var responds = 0;
    instances.forEach(function (instance, i) {
        var num = i === alLeastForEach - 1 ? alLeastForEach + mod : alLeastForEach; // +rest for the last one
        console.log('Sending ', num);
        var startTime = Date.now();
        parent.on('message', function (result) {
            result = JSON.parse(result);
            results.push(result);
            responds++;
            if (responds === instances.length) {
                callback(null, self.reduceAggregated(results, startTime));
            }
        });
        instance.send(num);
    });
};

MapReducer.prototype.concurrencySeries = function (concurrency, instance, num, callback) {
    var self = this;
    var alLeastForEach = Math.floor(num / concurrency);
    var mod = num % concurrency;
    alLeastForEach = alLeastForEach || mod ? 1 : 0;
    var results = [];
    var startTime = Date.now();
    console.log('Cond series interaring throw', alLeastForEach, num, concurrency);
    async.forEachOfSeries(new Array(alLeastForEach).fill(0), function (_, i, next) {
        var num = i === alLeastForEach - 1 ? alLeastForEach + mod : alLeastForEach; // +rest for the last one
        instance(num, function (err, result) {
            console.log('Got from instance', result);
            if (err) return next(err);
            results.push(result);
            next();
        });
    }, function (err) {
        if (err) {
            throw new Error(err);
        }
        callback(null, self.reduceRequests(results, startTime));
    });
};

module.exports = new MapReducer;
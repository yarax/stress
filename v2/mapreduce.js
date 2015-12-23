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
    console.log('RAX aggregating', results);
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

var results = [];
var responds = 0;
var startTime;

// Last process gets +rest of requests (eg 10 = 3 + 3 + 4)
MapReducer.prototype.mapProcesses = function (parent, instances, totalNum, callback) {
    var alLeastForEach = Math.floor(totalNum / instances.length);
    console.log('Total to send', totalNum, 'alLeastForEach', alLeastForEach, 'instances.length', instances.length);
    var mod = totalNum % instances.length;
    var self = this;
    results = [];
    responds = 0;
    startTime = Date.now();

    if (!parent.subscribed) {

        parent.on('message', function (result) {
            result = JSON.parse(result);
            results.push(result);
            responds++;
            console.log('CLUSTER', responds, instances.length);
            if (responds === instances.length) {
                responds = 0;
                callback(null, self.reduceAggregated(results, startTime));
            }
        });
        parent.subscribed = true;
    }

    instances.forEach(function (instance, i) {
        var num = ((i + 2) * alLeastForEach > totalNum) ? alLeastForEach + mod : alLeastForEach;
        console.log('Sending ', num);
        instance.send(num);
    });
};
// For the rest requests it's created a new iteration (e.g 10 = 3 + 3 + 3 + 1)
MapReducer.prototype.concurrencySeries = function (concurrency, instance, num, callback) {
    console.log('GFI need to process', num, process.pid);
    var self = this;
    var alLeastForEach = Math.ceil(num / concurrency);
    var mod = num % concurrency;
    var results = [];
    var startTime = Date.now();
    console.log('Cond series interaring throw', alLeastForEach, num, concurrency);
    async.forEachOfSeries(new Array(alLeastForEach).fill(0), function (_, i, next) {
        var num = i === alLeastForEach - 1 && mod  ? mod : concurrency; // +rest for the last one
        console.log('GFI gonna send', process.pid, num, 'i: ', i);
        instance(num, function (err, result) {
            console.log('GFI Got from instance', process.pid, result.length);
            if (err) return next(err);
            results = results.concat(result);
            next();
        });
    }, function (err) {
        console.log('ITERATED', process.pid);
        if (err) {
            throw new Error(err);
        }
        //console.log('Results before reduciong', results);
        callback(null, self.reduceRequests(results, startTime));
    });
};

module.exports = new MapReducer;
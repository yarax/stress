var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');
var logger = require('./logger');
require('./helper');

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

    return {
        rps: rps,
        aggregated: report
    };
};

MapReducer.prototype.reduceAggregated = function (results, startTime) {
    logger.debug('For reduce aggregated', results);
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
    logger.debug('Map processes\ntotal to send', totalNum, 'alLeastForEach', alLeastForEach, 'instances.length', instances.length);
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
            logger.debug('Cluster got responds: ', responds, 'instances:' , instances.length);
            if (responds === instances.length) {
                responds = 0;
                callback(null, self.reduceAggregated(results, startTime));
            }
        });
        parent.subscribed = true;
    }

    instances.forEach(function (instance, i) {
        var num = ((i + 2) * alLeastForEach > totalNum) ? alLeastForEach + mod : alLeastForEach;
        logger.debug('Sending for worker', num);
        instance.send(num);
    });
};
// For the rest requests it will create a new iteration (e.g 10 = 3 + 3 + 3 + 1)
MapReducer.prototype.concurrencySeries = function (concurrency, instance, num, callback) {
    logger.debug('ConcurrencySeries need to process', num);
    var self = this;
    var alLeastForEach = Math.ceil(num / concurrency);
    var mod = num % concurrency;
    var results = [];
    var startTime = Date.now();
    async.forEachOfSeries(new Array(alLeastForEach).fill(0), function (_, i, next) {
        var num = i === alLeastForEach - 1 && mod  ? mod : concurrency; // +rest for the last one
        logger.debug('ConcurrencySeries send for nnb', num, 'i: ', i);
        instance(num, function (err, result) {
            logger.debug('ConcurrencySeries got from nnb', result.length);
            if (err) return next(err);
            results = results.concat(result);
            next();
        });
    }, function (err) {
        logger.debug('ConcurrencySeries iterated');
        if (err) {
            throw new Error(err);
        }
        callback(null, self.reduceRequests(results, startTime));
    });
};

module.exports = new MapReducer;
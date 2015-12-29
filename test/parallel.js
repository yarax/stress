var mapreducer = require('../mapreduce');
var assert = require('assert');
var EE = require('events').EventEmitter;
var util = require('util');

var ParentProcess = function (){};
var ChildProcess = function (){};

util.inherits(ParentProcess, EE);
util.inherits(ChildProcess, EE);

var parent = new ParentProcess();

ChildProcess.prototype.send = function (num) {
    var results = [];
    for (var i = 0; i < num; i++) {
        results.push({headers: 'dfsf', body: 'dfdsdfg', time: 120});
    }
    var startTime = Date.now();

    setTimeout(function () {
        results = mapreducer.reduceRequests(results, startTime);
        parent.emit('message', JSON.stringify(results));
    }, 100);
};

var child = new ChildProcess();
var requester = function (num, callback) {
    setTimeout(function () {
        callback(null, {headers: 'dfsf', body: 'dfdsdfg', time: 120});
    }, 50);
};


describe('Parallel', function () {

    it('reduce requests', function () {
        var results = [
            {headers: 'dfsf', body: 'dfdsdfg', time: 120},
            {headers: 'dfsf', body: 'dfdsdfg', time: 130},
            {headers: 'dfsf', body: 'dfdsdfg', time: 121},
            {headers: 'dfsf', body: 'dfdsdfg', time: 156}
        ];
        var reduced = mapreducer.reduceRequests(results, Date.now() - 2000);
        assert.equal(reduced.aggregated.max, 156);
        assert.equal(reduced.aggregated.min, 120);
        assert.equal(reduced.aggregated.avg, 132);
        assert.equal(reduced.aggregated.requests, 4);
        assert.equal(Math.round(reduced.rps), 2);
    });

    it('reduce aggregated', function () {
        var results = [
            { rps: 2, aggregated: { max: 156, min: 120, avg: 132, requests: 4 } },
            { rps: 3, aggregated: { max: 166, min: 190, avg: 122, requests: 4 } },
            { rps: 5, aggregated: { max: 176, min: 100, avg: 192, requests: 6 } }
        ];

        var reduced = mapreducer.reduceAggregated(results, Date.now() - 2000);
        assert.equal(reduced.aggregated.max, 176);
        assert.equal(reduced.aggregated.min, 100);
        assert.equal(reduced.aggregated.avg, 149);
        assert.equal(reduced.aggregated.requests, 14);
        assert.equal(Math.round(reduced.rps), 7);
    });

    it('map processes', function (done) {
        mapreducer.mapProcesses(parent, [child, child], 5, function (err, results) {
            assert(typeof results.rps, 'number');
            assert(typeof results.aggregated, 'object');
            done(err);
        });
    });

    it('concurrency series', function (done) {
        mapreducer.concurrencySeries(3, requester, 10, function (err, results) {
            assert(typeof results.rps, 'number');
            assert(typeof results.aggregated, 'object');
            done(err);
        });
    });

});
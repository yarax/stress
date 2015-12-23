var cluster = require('cluster');
var http = require('http');
var async = require('async');
var config = require('../configs/default.json');
var Kefir = require('kefir');
var mapreducer = require('./mapreduce');
var conf = config.tasks[0].attack;
var workersNum = 2;
var concStairs = [];
var step = 0;
var Nnb = require('nnb');

var concurrency = config.concurrency;
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
    concStairs = new Array(stepsCount).fill(0).map(function (_, i) {
        return conf.from + conf.step * i;
    });
    console.log('concStairs', concStairs);
} else {
    console.log("Type %s is not supported", conf.type);
    process.exit();
}

var workers = [];

if (cluster.isMaster) {
    var fe = require('./frontend');

    function nextStep() {
        var requestsNumber = concStairs[step];
        if (!requestsNumber) {
            return console.log('Done');
        }
        console.log('Workers num: ', workers.length);
        mapreducer.mapProcesses(cluster, workers, requestsNumber, function (err, results) {
            console.log('Got results from all workers', results);
            results.step = step;
            fe.emit('data', results);
            step++;
            console.log("FENYA gonna run", requestsNumber, results.aggregated.requests, step, concStairs[step]);
            nextStep();
        });
    }
    // Begin when frontend and workers are connected
    Kefir.zip([
        Kefir.fromEvents(cluster, 'clusterReady'),
        Kefir.fromEvents(fe, 'connected')
    ]).onValue(function () {
        console.log('lets start');
        nextStep();
    });

    Kefir.fromEvents(cluster, 'message').scan(function (prev, cur) {
        //console.log('message', prev, cur);
        if (cur === 'PING') {
            console.log('Ping come');
            return prev+1;
        }
    }, 0).onValue(function (sum) {
        if (sum === workers.length) {
            cluster.emit('clusterReady');
        }
    });

    // Fork workers and waiting for ready
    new Array(workersNum).fill(0).forEach(function () {
        console.log('Forking..');
        var worker = cluster.fork();
        workers.push(worker);
    });
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
} else {

    // Worker
    console.log("Inited sending PINg", process.pid);
    process.send('PING');
    process.on("message", function (msg) {
        console.log('Hi, iam a ', process.pid, 'got', msg);
        var numforWorker = parseInt(msg);
        var instance = function (num, callback) {
            console.log("Instance wrapper", num);
            var nnb = new Nnb({
                url: config.tasks[0].request.url,
                concurrency: num
            });
            console.log('Launching nnb with', num);
            nnb.go(callback);
        };
        mapreducer.concurrencySeries(concurrency, instance, numforWorker, function (err, results) {
            process.send(JSON.stringify(results));
        });

    });

}
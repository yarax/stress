var cluster = require('cluster');
var http = require('http');
var async = require('async');
var config = require('config');
var Kefir = require('kefir');
var logger = require('./logger');

//logger.debug = logger.log;
var mapreducer = require('./mapreduce');
var conf = config.tasks[0].attack;
var workersNum = config.workersNum;
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
    //console.log('concStairs', concStairs);
} else {
    logger.error("Type %s is not supported", conf.type);
    process.exit();
}

var workers = [];

if (cluster.isMaster) {
    var fe = require('./frontend');

    function nextStep() {
        var requestsNumber = concStairs[step];
        if (!requestsNumber) {
            logger.info('Done');
            process.exit();
        }
        mapreducer.mapProcesses(cluster, workers, requestsNumber, function (err, results) {
            logger.debug('Got results from all workers', results);
            results.step = step;
            fe.emit('data', results);
            step++;
            logger.debug('Was sent', requestsNumber, 'got', results.aggregated.requests);
            nextStep();
        });
    }
    // Start when frontend and workers are connected
    Kefir.zip([
        Kefir.fromEvents(cluster, 'clusterReady'),
        Kefir.fromEvents(fe, 'connected')
    ]).onValue(function () {
        logger.info('Cluster and frontend are ready, starting...');
        nextStep();
    });

    Kefir.fromEvents(cluster, 'message').scan(function (prev, cur) {
        if (cur === 'PING') {
            logger.debug('Ping');
            return prev+1;
        }
    }, 0).onValue(function (sum) {
        if (sum === workers.length) {
            cluster.emit('clusterReady');
        }
    });

    // Fork workers and waiting for ready
    new Array(workersNum).fill(0).forEach(function () {
        var worker = cluster.fork();
        workers.push(worker);
    });
    cluster.on('exit', function(worker, code, signal) {
        logger.error('Worker ' + worker.process.pid + ' died');
    });
} else {

    // Worker
    process.send('PING');
    process.on("message", function (msg) {
        logger.debug("Hi, I'm a ", process.pid, 'got', msg);
        var numforWorker = parseInt(msg);
        var instance = function (num, callback) {
            var nnb = new Nnb({
                url: config.tasks[0].request.url,
                concurrency: num
            });
            logger.debug('Launching nnb with', num);
            nnb.go(callback);
        };
        mapreducer.concurrencySeries(concurrency, instance, numforWorker, function (err, results) {
            process.send(JSON.stringify(results));
        });

    });

}
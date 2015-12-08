/**
    Request logic and wrapper for Reciever
*/

var async = require("async");
var request = require("request");
var FileCookieStore = require("tough-cookie-filestore");
var Nnb = require('nnb');

var Worker = function (attackers) {
    this.attackers = attackers;
};

/*
    Worker takes data object from master, with required fields:
    - reqs (number of requests to do)
    - taskIndex (index of current task)
 */

Worker.prototype.run = function (data, type) {
	
	var reqs = data.reqs;
	var task = config.tasks[data.taskIndex];
    var duration = task.attack.dur;
	var arr = [];
    for (var i =0;i<reqs;i++) {arr.push(1)}
    var attacker = task.attack.type;

    task.request.jar = request.jar(new FileCookieStore(config.cookieStore));
    var receiver = this.attackers[attacker].receiver;
    var reporter = this.attackers[attacker].reporter;
    var done = false;
    setTimeout(function () {
        if (!done) {
            process.send(JSON.stringify({error : "Can't make " + reqs + " requests per " + duration + "ms for " + task.request.url + ". \n Please, try to up the duration\n"}));
        }
    }, duration * 1.2);

    receiver.resetReport();
    receiver.startTime = Date.now();
    receiver.delay = (duration || 0) / reqs;
    receiver.data = data;
    receiver.report.num = reqs;
    var completed = 0;

    console.log("Need to execute: ", reqs);

    setInterval(function () {
        console.log("RPS: ", completed);
        completed = 0;
    }, 1000);
    if (!attacker) throw new Error("Please add type of attacker in data for worker");

    console.log("RAX", task.request.url);

    var nnb = new Nnb({
        url: task.request.url,
        concurrency: reqs
    });

    nnb.go(function (err, results) {
        receiver.report.max = results.reduce(function (prev, item) {
            if (item.time > prev) return item;
            else return prev;
        }, -Infinity);
        receiver.report.min = results.reduce(function (prev, item) {
            if (item.time < prev) return item;
            else return prev;
        }, Infinity);

        done = true;
        console.log(results, receiver);
        process.send(JSON.stringify(receiver.report));
    });

	/*async.each(arr, function (_, next) {

	    var req = request(task.request, receiver.handle.bind(receiver, function (result) {
            completed++;
            result.pid = process.pid;
            result.reqs = reqs;
            result.url = task.request.url;
            result.duration = duration;

            reporter.logAll(result);

            next();
        }));

        req.on('socket', function (socket) {
            socket.setTimeout(config.requestTimeout || 5000);
            socket.on('timeout', function() {
                req.abort();
                next();
            });
        });

        req.end();

    }, function () {
        done = true;
	    process.send(JSON.stringify(receiver.report));
	});*/


};

module.exports = Worker;
/**
    Request logic and wrapper for Reciever
*/

var async = require("async");
var request = require("request");
var FileCookieStore = require("tough-cookie-filestore");

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

    receiver.resetReport();
    receiver.startTime = Date.now();
    receiver.delay = (duration || 0) / reqs;
    receiver.data = data;
    receiver.report.num = reqs;

    if (!attacker) throw new Error("Please add type of attacker in data for worker");
	
	async.each(arr, function (_, next) {

	    request(task.request, receiver.handle.bind(receiver, function (result) {

            result.pid = process.pid;
            result.reqs = reqs;
            result.url = task.request.url;
            result.duration = duration;

            reporter.logAll(result);

            next();
        }));

	}, function () {
	    process.send(JSON.stringify(receiver.report));
	});
};

module.exports = Worker;
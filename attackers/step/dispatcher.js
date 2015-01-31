/**
    Dispatcher
    Sends tasks to workers, gets reports from them and proxy it to frontend
*/

var util = require("util");
var fs = require("fs");
var events = require("events");
var ProgressBar = require('progress');


var Step = function (workers, taskIndex, attackers) {

	this.task = config.tasks[taskIndex];

    if (this.task.attack.from > this.task.attack.to) throw new Error("Wrong attack from-to range");

	this.taskIndex = taskIndex;
    this.attacker = attackers[this.task.attack.type];
	this.workers = workers;
	this.currentStep = this.task.attack.from;
	this.answers = 0;
    this.summary = [];
	var num = Math.round((this.task.attack.to-this.task.attack.from)/this.task.attack.step);
	this.bar = new ProgressBar(':bar', { total: num, width: 50 });
};

util.inherits(Step, events.EventEmitter);

// next step for all workers
Step.prototype.run = function () {
	
	this.bar.tick();

    this.summary = [];
    var self = this;
    
    if (this.currentStep <= this.task.attack.to) {

        var each = Math.ceil(this.currentStep / this.workers.length); // request per worker
        var last = this.currentStep; // if requests less than workers

        this.workers.forEach(function (worker) {
            var data ;
            if (last <= 0) {
                data = {};
            } else {
                data = {
                    reqs : each <= 0 ? 0 : each,
                    taskIndex : self.taskIndex,
                    duration : self.task.attack.dur
                };
            }
            worker.send(JSON.stringify(data));
            last -= each;
        });
    } else {
    	this.emit("done");
    }

};

Step.prototype.masterHandler = function (data) {
	
	this.answers++;

    if (Object.keys(data).length) this.summary.push(data);

    //console.log(this.summary);

	if (this.answers === this.workers.length) {
	    var aggregated = this.attacker.reporter.logAggregate(this.summary);
        this.attacker.frontend.emit("data", {
            aggregated: aggregated,
            step : this.currentStep
        });
	    this.answers = 0;
	    
	    this.currentStep = this.currentStep + this.task.attack.step;
	    
	    this.run();
	}
};


module.exports = Step; 
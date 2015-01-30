var config = require("../config.json");
var fs = require("fs");
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var Worker = require("./worker");
var workerInstance;
var events = require("events");
var util = require("util");

var Stress = function (config) {
    this.attackers = {};
    this.currentTask = 0;
    this.workers = [];
    this.tasks = config.tasks;
    this.init();
    this.on("ready", this.next.bind(this));
    this.fork();

};



util.inherits(Stress, events.EventEmitter);

Stress.prototype.init = function () {

    var self = this;

	if (!fs.existsSync(config.cookieStore)) {
		var res = fs.writeFileSync(config.cookieStore, "");
		if (!res) throw new Error("Error creating cookie file", config.cookieStore);
	}

    var dir = __dirname + "/../attackers";
    var attacks = fs.readdirSync(dir);

	attacks.forEach(function (attacker) {
        attacker = attacker.replace(".js", "");
		self.attackers[attacker] = {
            iterator : require(dir + "/" + attacker + "/iterator.js"),
            receiver : require(dir + "/" + attacker + "/receiver.js"),
            reporter : require(dir + "/" + attacker + "/reporter.js")
        };

        if (cluster.isMaster) {
            self.attackers[attacker].reporter.fillHeaders();
            self.attackers[attacker].frontend = require(dir + "/" + attacker + "/frontend.js");
        }

	});

    workerInstance = new Worker(self.attackers);

};
    
Stress.prototype.fork = function () {
	var self = this;
	var pings = 0;
    var worker;
	if (cluster.isMaster) {
	  for (var i = 0; i < numCPUs; i++) {
	    worker = cluster.fork();
	    worker.on("message", function (msg) {
            console.log("Come FROM worker", msg);
	    	var data = JSON.parse(msg);
	    	if (data.type === "ping") {
	    		pings++;
	    		if (pings === self.workers.length) self.emit("ready");
	    	} else {
	    		self.attack.masterHandler(data);
	    	}
	    });
	    self.workers.push(worker);
	  }
	} else {
		process.send(JSON.stringify({type: "ping"}));
		process.on("message", function (msg) {
            console.log("Come to worker", msg);
			var data = JSON.parse(msg);
            if (data.taskIndex === undefined) { // empty call
                process.send("{}");
            } else {
                workerInstance.run(data);
            }

		});
	}

};

Stress.prototype.next = function () {
	var task = this.tasks[this.currentTask];
	if (!task) {
		console.log("\nDone");
		//setTimeout(process.exit.bind(process), 2000);
	} else {
        var attacker = this.attackers[task.attack.type];
		this.attack = new attacker.iterator(this.workers, this.currentTask, this.attackers);
		this.attack.on("done", this.next.bind(this));
		this.attack.run();
		this.currentTask++;
	}
};



new Stress(config);


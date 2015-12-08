var fs = require("fs");
var cluster = require('cluster');
var numCPUs = 1;
var Worker = require("./worker");
var workerInstance;
var async = require("async");
var events = require("events");
var util = require("util");
var configName = process.argv[2] || "default";
global.config = require("../configs/" + configName + ".json");

var Stress = function (config) {
    this.attackers = {};
    this.currentTask = 0;
    this.workers = [];
    this.tasks = config.tasks;
    var self = this;

    async.parallel([

    	this.init.bind(this),
    	this.fork.bind(this)

    	], function () {
    		if (cluster.isMaster) {
    			self.next();
    	    }
    	});
    
   
};

util.inherits(Stress, events.EventEmitter);

Stress.prototype.init = function (cb) {

    var self = this;

	if (!fs.existsSync(config.cookieStore)) {
		var res = fs.writeFileSync(config.cookieStore, "");
	}

    var dir = __dirname + "/../attackers";
    var attacks = fs.readdirSync(dir);

	attacks.forEach(function (attacker) {
        attacker = attacker.replace(".js", "");
		self.attackers[attacker] = {
            dispatcher : require(dir + "/" + attacker + "/dispatcher.js"),
            receiver : require(dir + "/" + attacker + "/receiver.js"),
            reporter : require(dir + "/" + attacker + "/reporter.js")
        };

        if (cluster.isMaster) {
            self.attackers[attacker].reporter.fillHeaders();
            try {
	            var fe = require(dir + "/" + attacker + "/frontend.js");
	            self.attackers[attacker].frontend = fe;
	            if (config.webReport) {
	            	fe.on("connected", cb);
	            } else {
	            	cb();
	            }
            } catch (e) {
            	cb();
            }
        }

	});

    workerInstance = new Worker(self.attackers);

};
    
Stress.prototype.fork = function (cb) {
	var self = this;
	var pings = 0;
    var worker;
	if (cluster.isMaster) {
	  for (var i = 0; i < numCPUs; i++) {
	    worker = cluster.fork();
	    worker.on("message", function (msg) {
            //console.log("Come FROM worker", msg);
	    	var data = JSON.parse(msg);
	    	if (data.type === "ping") {
	    		pings++;
	    		if (pings === self.workers.length) cb();
	    	} else if (data.error) {

				console.log(data.error);
				process.exit();

			} else {
	    		self.attack.masterHandler(data);
	    	}
	    });
	    self.workers.push(worker);
	  }
	} else {
		process.send(JSON.stringify({type: "ping"}));
		process.on("message", function (msg) {
            //console.log("Come to worker", msg);
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
		setTimeout(process.exit.bind(process), 2000);
	} else {
        var attacker = this.attackers[task.attack.type];
		this.attack = new attacker.dispatcher(this.workers, this.currentTask, this.attackers);
		this.attack.on("done", this.next.bind(this));
		this.attack.run();
		this.currentTask++;
	}
};



new Stress(config);


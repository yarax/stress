var fs = require("fs");
var config = require("../../config.json");

var Reporter = function () {
    this.delimiter = "\t";
};

Reporter.prototype.logAll = function (data) {

    var line = Object.keys(data).map(function (key){return data[key]}).join(this.delimiter) + "\n";
    var file = config.fullLog;
    if (!file) return;

    fs.appendFile(file, line, function () {});

};

Reporter.prototype.logAggregate = function (summary) {

    var file = config.aggregateLog;
    var sum = 0;
    var max = 0;
    var min = Infinity;
    var num = 0;

    summary.forEach(function (item) {
        sum+=item.sum;
        num+=item.num;
        if (max > item.max) max = item.max;
        if (min < item.min) min = item.min;

    });

    var avg = sum / num;

    var line = sum + this.delimiter + num + this.delimiter + avg + this.delimiter + max + this.delimiter + min + "\n";

    fs.appendFile(file, line, function () {});

    return {sum :sum, min: min, max: max, num: num};

};

Reporter.prototype.fillHeaders = function () {

    var file = config.fullLog;
    var line = "reqTime" + this.delimiter + "status" + this.delimiter + "body" + this.delimiter + "pid" + this.delimiter + "reqs" + this.delimiter + "url" + this.delimiter + "duration\n";

    fs.writeFileSync(file, line);

    file = config.aggregateLog;
    line = "sum" + this.delimiter + "max" + this.delimiter + "min" + this.delimiter + "num" + "\n";

    fs.writeFileSync(file, line);
};

module.exports = new Reporter;
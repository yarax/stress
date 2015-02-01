/**
    Gets data from main thread as an array of workers results
    Formand log  reports
*/

var fs = require("fs");

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
    if (!file) return;
    var sum = 0;
    var max = 0;
    var min = Infinity;
    var num = 0;

    summary.forEach(function (item) {
        sum+=item.sum;
        num+=item.num;
        if (item.max > max) max = item.max;
        if (item.min < min) min = item.min;

    });

    var avg = parseInt(sum / num);

    var line = num + this.delimiter + avg + this.delimiter + max + this.delimiter + min + this.delimiter + sum + "\n";

    fs.appendFile(file, line, function () {});

    summary = [];
    return {min: min, max: max, avg: avg};

};

Reporter.prototype.fillHeaders = function () {

    var file = config.fullLog;

    if (file) {
        var line = "reqTime" + this.delimiter + "status" + this.delimiter + "body" + this.delimiter + "pid" + this.delimiter + "reqs" + this.delimiter + "url" + this.delimiter + "duration\n";
        fs.writeFileSync(file, line);
    }

    file = config.aggregateLog;

    if (file) {
        line = "num" + this.delimiter + "avg" + this.delimiter + "max" + this.delimiter + "min" + this.delimiter + "sum\n";
        fs.writeFileSync(file, line);
    }
};

module.exports = new Reporter;
/**
    Callback for worker's request response
    Aggregating logic and work with responses
*/

var Receiver = function () {
    this.startTime = 0; // defined in worker
    this.delay = 0; // defined in worker
};

// reset values for each new iteration
Receiver.prototype.resetReport = function () {
    this.report = { // required fields for aggregation
        sum : 0,
        max : 0,
        min : Infinity
    }
}

Receiver.prototype.handle = function (cb, err, response, body) {

    var time = (Date.now() - this.startTime);
    this.report.sum += time;

    if (time > this.report.max) this.report.max = time;
    if (time < this.report.min) this.report.min = time;

    setTimeout(cb.bind(cb, {
        reqTime : time,
        status : response ? response.statusCode : "NO_RESPONSE",
        body: body

    }), this.delay);

};

module.exports = new Receiver;
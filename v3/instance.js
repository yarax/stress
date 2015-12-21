function Instance() {
    self.descendants = [];
}

Instance.prototype.defaultDescendants = function (n) {
    var EE = require('events').EventEmmiter;
    var self = this;
    new Array(n).fill(0).forEach(function () {
        self.descendants.push(new EE);
    });

};

Instance.prototype.map = function (n) {

};

Instance.prototype.reduce = function () {

};
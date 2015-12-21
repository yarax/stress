var Bacon = require('baconjs');
var Rx = require('rx');
var Kefir = require('kefir');
var EE = require('events').EventEmitter;
var ee = new EE;

var sum = function (prev, cur) {return prev+cur};

//Bacon.fromEvent(ee, 'event1').scan(0, sum).onValue(console.log);
//Rx.Observable.fromEvent(ee, 'event1').reduce(sum, 0).subscribe(console.log);
//Kefir.fromEvents(ee, 'event1').scan(sum, 0).onValue(console.log);

var ev1 = Kefir.fromEvents(ee, 'event1');
var ev2 = Kefir.fromEvents(ee, 'event2');
Kefir.zip([ev1, ev2]).onValue(console.log);

ee.emit('event2', 4);
setTimeout(function () {
    ee.emit('event1', 5);
}, 1000);

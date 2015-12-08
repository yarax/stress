/**
 Additional module to output reports in browser with websockets
 Notice: More than one tasks with different frontends is unpredictable
 */
var events = require("events");
var util = require("util");
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected = false;

var PORT = 3008;

var Frontent = function () {
    var self = this;

    app.get('/', function(req, res){
        res.sendFile(__dirname + '/web/index.html');
    });

    http.listen(PORT, function(){
        console.log("\nListening frontend from: http://localhost:" + PORT + "\n\n");
    });

    io.on('connection', function(socket){
        if (connected) return;
        connected = true;
        self.emit("connected");
    });

    this.on("data", function (data) {
        io.emit('data', data);
    });

};

util.inherits(Frontent, events.EventEmitter);

module.exports = new Frontent;
var events = require("events");
var util = require("util");
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Frontent = function () {

    app.get('/', function(req, res){
        res.sendFile(__dirname + '/web/index.html');
    });

    http.listen(3008, function(){
        console.log('http://localhost:3008');
    });

    io.on('connection', function(socket){
        console.log('a user connected');
    });

    this.on("data", function (data) {
        io.emit('data', data);
    });

};

util.inherits(Frontent, events.EventEmitter);

module.exports = new Frontent;
var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
const Messages = require('./models/messages');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, 'public')));
    app.use(require('./routes/messages'));

    httpServer.on('request', app);

    scServer.on('connection', function (socket) {
      socket.on('chat', function (msg) {
        Messages.add(msg);
        scServer.exchange.publish('chat', msg);
      });
    });
  }
}

new Worker();

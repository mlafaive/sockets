var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var Thread = require('./models/thread');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var httpServer = this.httpServer;
    var app = express();
    if (environment === 'dev') {
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, 'public')));
    httpServer.on('request', app);

    var scServer = this.scServer;
    scServer.on('connection', function (socket) {
      // get messgages for thread
      socket.on('thread', function (tid, res) {
        Thread.findById(tid, function(err, thread) {
          if (err) {
            res(err);
            return;
          }
          res(null, thread.messages);
        });
      });

      // get threads for a user
      socket.on('threads', function (user, res) {
        Thread.find({ users: user }, '_id title',  function(err, threads) {
          if (err) {
            console.log(err);
            res(err);
            return;
          }
          res(null, threads);
        });
      });

      // create thread
      socket.on('new', function (thread, res) {
        // need to validate
        var t = new Thread();    
        t.title = thread.title;
        t.users = [thread.user];
        t.save(function(err, t_new) {
          if (err) {
            res(err);
            return;
          }          
          res(null, t_new);
        });
      });

      socket.on('chat', function(msg, res){
        Thread.findById(msg.threadId, function(err, thread) {
          if (err) {
            res(err);
            return;
          }
          thread.messages.push(msg);
          thread.save(function(err) {
            scServer.exchange.publish('chat-' + msg.threadId, msg);
            res(err);
          });
        });
      });
    });
  }
}

new Worker();

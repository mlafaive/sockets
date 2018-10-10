var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var Thread = require('./models/thread');
var { Emit, Subscribe, PublishIn, PublishOut, Verify } = require('./auth');

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
    scServer.addMiddleware(scServer.MIDDLEWARE_EMIT, Emit);
    scServer.addMiddleware(scServer.MIDDLEWARE_SUBSCRIBE, Subscribe);
    scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, PublishIn);
    scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_OUT, PublishOut);
    scServer.on('connection', function (socket) {

      // set auth token for users
      socket.on('login', function (user, res) {
        Verify(user).catch(res);
        var authToken = {
          email: user.email,
          threads: []
        };
        Thread.find({ users: user.email }, '_id',  function(err, threads) {
          if (err) {
            res(err);
            return;
          }
          for (var i = 0; i < threads.length; i++) {
            authToken.threads.push(String(threads[i]._id));
          }
          socket.setAuthToken(authToken);
          res();
        });
      });
      // get messgages for thread
      socket.on('thread', function (tid, res) {
        if (!socket.authToken.threads.includes(tid)) {
          res('User does not have permissions to view thread');
          return;
        }
        Thread.findById(tid, function(err, thread) {
          if (err) {
            res(err);
            return;
          }
          res(null, thread.messages);
        });
      });

      // get threads for a user
      socket.on('threads', function (data, res) {
        Thread.find({ users: socket.authToken.email }, '_id title',  function(err, threads) {
          if (err) {
            res(err);
            return;
          }
          res(null, threads);
        });
      });

      // create thread
      socket.on('new', function (thread, res) {
        if (!thread || typeof thread !== 'object'){
          res('must send a thread to create');
          return;
        }
        // need to validate
        var t = new Thread();    
        t.title = thread.title;
        t.users = [socket.authToken.email].concat(thread.users || []);
        t.save(function(err, t_new) {
          if (err) {
            res(err);
            return;
          }          
          for (var i = 0; i < t_new.users.length; i++) {
            scServer.exchange.publish(t_new.users[i], t_new);
          }
        });
      });
    });
  }
}

new Worker();

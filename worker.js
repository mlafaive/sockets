var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var Thread = require('./models/thread');
var { Emit, Subscribe, Publish, Verify } = require('./auth');

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
    scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, Publish);
    scServer.on('connection', function (socket) {

      // set auth token for users
      socket.on('login', function (user, res) {
        Verify(user).catch(res);
        var authToken = {
          email: user.email,
        };
        console.log('setting token');
        socket.setAuthToken(authToken);
        res();
      });
      // get messgages for thread
      socket.on('thread', function (tid, res) {
        Thread.findById(tid, function(err, thread) {
          if (err) {
            res(err);
            return;
          }
          if (!thread.users.includes(socket.authToken.email)) {
            res('User does not have permissions to view thread');
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
        t.users = [thread.user].concat(thread.users || []);
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

      socket.on('chat', function(msg, res){
        if (!msg || typeof msg !== 'object'){
          res('must send a msg to create');
          return;
        }
        Thread.findById(msg.threadId, function(err, thread) {
          if (err) {
            res(err);
            return;
          }
          thread.messages.push(msg);
          thread.save(function(err) {
            if (err) {
              res(err);
              return;
            }
            if (!thread.users.includes(socket.authToken.email)) {
              res('User does not have permissions to view thread');
              return;
            }
            scServer.exchange.publish('chat-' + msg.threadId, msg);
            res();
          });
        });
      });
    });
  }
}

new Worker();

var Thread = require('./models/thread');

const CLIENT_ID = '117438755761-v2v4q06ts58pddsng2is1kbr48ulamre.apps.googleusercontent.com';
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

const CHAT_PREFIX = 'chat-';

async function Verify(user) {
  if (!user || typeof user !== 'object'){
    throw Error('not verified');
  }
  const ticket = await client.verifyIdToken({
      idToken: user.tokenId,
      audience: CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (payload.email !== user.email) {
    throw Error('not verified');
  }
}

function Emit(req, next) {
  if (req.event === 'login') {
    next();
    return;
  }
  var authToken = req.socket.authToken;
  if (authToken) {
    next(); // Allow
  } else {
    next(true);
  }
}

function Subscribe(req, next) {
  var authToken = req.socket.authToken;
  if (authToken && req.channel === authToken.email) {
    next();
    return;
  }
  var threadId = req.channel.startsWith(CHAT_PREFIX) && req.channel.slice(CHAT_PREFIX.length);
  if (authToken && threadId && authToken.threads.includes(threadId)) {
    next();
    return;
  }
  next(true);
}


function PublishIn(req, next) {
  var authToken = req.socket.authToken;
  var threadId = req.channel.startsWith(CHAT_PREFIX) && req.channel.slice(CHAT_PREFIX.length);
  if (authToken && threadId && authToken.threads.includes(threadId)) {
    if (!req.data || typeof req.data !== 'object'){
      req.ackData = 'must send a msg to create';
      next(true);
      return;
    }
    Thread.findById(req.data.threadId, function(err, thread) {
      if (err) {
        req.ackData = 'must send a msg to create';
        next(true);
        return;
      }
      var msg = {
        user: authToken.email,
        body: req.data.body
      };
      thread.messages.push(msg);
      thread.save(function(err) {
        if (err) {
          req.ackData = 'could not create message';
          next(true);
          return;
        }
        msg.threadId = req.data.threadId;
        req.data.user = authToken.email;
        req.ackData = msg;
        next();
      });
    });
  }
  else {
    next(true);
  }
}

function PublishOut(req, next) {
  var authToken = req.socket.authToken;
  if (authToken && authToken.email !== req.data.user) {
    authToken.threads.push(req.data.threadId);
  }
  else {
    next(true);
  }
}

module.exports = {
  Emit,
  Subscribe,
  PublishIn,
  PublishOut,
  Verify
}
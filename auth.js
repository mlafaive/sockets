var Thread = require('./models/thread');

const CLIENT_ID = '117438755761-v2v4q06ts58pddsng2is1kbr48ulamre.apps.googleusercontent.com';
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
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
  console.log('authToken: ', authToken);
  if (!authToken) {
    next(true);
    return;
  }
  if (req.channel === authToken.email) {
    next();
    return;
  }
  var parts = req.channel.split('-');
  var threadId = parts.length > 1 && parts[0] === 'chat' && parts[1];
  if (!threadId) {
    next(true);
    return;
  }
  Thread.findById(threadId, function(err, thread) {
    if (err) {
      next(err);
      return;
    }
    if (!thread.users.includes(authToken.email)) {
      next(true);
      return;
    }
    next();
    return;
  });
}

// for now only the server can publish to channels
function Publish(req, next) {
  next(true);
  return;
}

module.exports = {
  Emit,
  Subscribe,
  Publish,
  Verify
}
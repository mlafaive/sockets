var messages = [];

module.exports = {
  all: () => {
    return messages
  },
  add: (msg) => {
    messages.push(msg);
  }
};
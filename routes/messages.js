const express = require('express');
const app = express();
const Messages = require('../models/messages');


app.get('/messages', (req, res) => {
	res.json(Messages.all());
});

module.exports = app;
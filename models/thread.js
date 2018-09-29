const mongoose = require('mongoose');
var Schema = mongoose.Schema;
var DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/Sockets';
mongoose.connect(DB_URL, { autoIndex: false });

var threadSchema = new mongoose.Schema({
	title: String,
  users: {
  	type: [
  		{
    		type: String,
    		lowercase: true,
    		required: true
  		}
  	], 
  	index: true,
  	required: true
  },
  messages: {
  	type: [
	  	{
	  		user: {
			    type: String,
			    lowercase: true,
			    required: true
			  },
	  		body: {
			    type: String,
			    required: true
			  }
	  	}
	  ],
	  default: []
	}
}, { timestamps: true });





module.exports = mongoose.model('Thread', threadSchema);;
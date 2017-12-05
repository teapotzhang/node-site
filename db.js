//Import the mongoose module
var mongoose = require('mongoose');
var opts = {
	server:{
		socketOptions: { keepAlive: 1 }
	}
};

DB_URL ='mongodb://localhost:27017/memory';

mongoose.Promise = global.Promise;

//Set up default mongoose connection
mongoose.connect(DB_URL, opts);
// Get Mongoose to use the global promise library

mongoose.connection.on('connected', function(){
	console.log('Mongoose connection open to ' + DB_URL);
});

module.exports = mongoose;
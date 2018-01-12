//Import the mongoose module
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var opts = {
	server:{
		socketOptions: { keepAlive: 1 }
	}
};

DB_URL ='mongodb://peiwen:XiaoKa001@172.17.17.10:27017/memory?authSource=admin';

//Set up default mongoose connection
mongoose.connect(DB_URL, opts);
// Get Mongoose to use the global promise library

mongoose.connection.on('connected', function(){
	console.log('Mongoose connection open to ' + DB_URL);
});

module.exports = mongoose;
var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
	nickName: String,
	openID: String,
	session_key: String,
	unionID: String,
	gender: String,
	province: String,
	city: String,
	country: String,
	avartar_url: String
});

var User = mongoose.model('User', userSchema);
module.exports = User;
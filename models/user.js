var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
	nickName: String,
	openID: String,
	session_key: String,
	unionID: String,
	gender: String,
	avartar_url: String,
	session_id: String,
	address : {
		province: String,
		city: String,
		country: String
	},
	last_udpated: Date
});

var UserSchema = db.model('User', UserSchema);
module.exports = UserSchema;
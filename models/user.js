var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
	nickName: String,
	openID: {
        type: String,
        required: true
    },
	session_key: {
        type: String,
        required: true
    },
	unionID : String,
	timestamp : Number,
	gender: String,
	avartar_url: String,
	session_id: { type: String, index: { unique: true } },
	province: String,
	city: String,
	country: String,
	targetCents : Number,
	userCardRecord : Array,	//弃用
	todayCards : Number,  //弃用
	totalCards : Number,  //弃用
	lastUpdateTime : Number //弃用
});

var UserModel = db.model('User', UserSchema);
module.exports = UserModel;
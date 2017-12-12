var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserCardSchema = new Schema({
	card_unique_id : String,  //确定卡片的id
	LastShowDate : Date,   //确定这张卡下次出现的时间
	openID : String,   //确定是谁
	sessionID : String,
	Showed: Boolean,   //是否出现过
	usedStatus: Array,
	activated: Boolean
});

var UserCardModel = db.model('UserCard', UserCardSchema);
module.exports = UserCardModel;
var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserCardSchema = new Schema({
	card_unique_id : String,  //确定卡片的id
	PackageName : String, //确定卡包
	SubPackageName : String, //确定子卡包
	LastShowDate : Number,   //确定这张卡下次出现的时间
	LastUpdateDate : Number, //确定最后一次这张卡背诵的时间
	openID : String,   //确定是谁
	Showed: Boolean,   //是否出现过
	usedStatus: Array,
	randomNumber : Number,
	activated: Boolean
});

var UserCardModel = db.model('UserCard', UserCardSchema);
module.exports = UserCardModel;
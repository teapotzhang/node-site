var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var PackageSchema = new Schema({
	packageName : String,
	SubPackageName : String,
	packageId : Number, //自增，用于返回package列表时候进行排序
	packagePrice : Number,  //单位是分
	packageCardNumber : Number,  //这个卡包里一共有多少张卡
	packageDesc : String, //卡包简介
	packageUpdateTime : String //卡包最后更新时间
});

var PackageModel = db.model('Package', PackageSchema);
module.exports = PackageModel;
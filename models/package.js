var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

//该类只用于卡包排序以及卡包价格的展示
var PackageSchema = new Schema({
	packageName : String,
	packageId : Number, //自增，用于返回package列表时候进行排序
	packagePrice : Number  //单位是分
});

var PackageModel = db.model('Package', PackageSchema);
module.exports = PackageModel;
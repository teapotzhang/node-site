var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var PackageSchema = new Schema({
	packageName : { type: String, index: { unique: true } },
	packagePrice : Number  //单位是分
});

var PackageModel = db.model('Package', PackageSchema);
module.exports = PackageModel;
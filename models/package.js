var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var PackageSchema = new Schema({
	packageName : String,
	packagePrice : Number
});

var PackageModel = db.model('Package', PackageSchema);
module.exports = PackageModel;
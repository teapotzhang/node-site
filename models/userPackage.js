var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserPackageSchema = new Schema({
	PackageName : String,
	SubPackageName : String,
	Purchased : Boolean,
	Activated : Boolean,
	openID : String
});

UserSchema.index({ openID : 1 , Activated : -1});

var UserPackageModel = db.model('UserPackage', UserPackageSchema);
module.exports = UserPackageModel;
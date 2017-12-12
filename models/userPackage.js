var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserPackageSchema = new Schema({
	PurchasedPackages : Array,
	ActivatedPackages : Array,
	openID : String
});

var UserPackageModel = db.model('UserPackage', UserPackageSchema);
module.exports = UserPackageModel;
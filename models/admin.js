var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var AdminSchema = new Schema({
	username : String,
	password : String
});

var AdminModel = db.model('Admin', AdminSchema);
module.exports = AdminModel;
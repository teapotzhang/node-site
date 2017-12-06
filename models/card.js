var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var CardSchema = new Schema({
	packageName : String,
	package_price : Number,
	cardType : String,
	rightItem : Number,
	expression : String,
	blueItem : String,
	redItem : String,
	firstLine : String,
	lastLine : String,
	analysis : String,
	card_unique_id : String,
	activated: Boolean
});

var CardModel = db.model('Card', CardSchema);
module.exports = CardModel;
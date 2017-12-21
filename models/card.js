var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var CardSchema = new Schema({
	packageName : String,
	cardType : String,
	rightItem : Number,
	expression : String,
	blueItem : String,
	redItem : String,
	firstLine : String,
	lastLine : String,
	analysis : String,
	yearNumber : Number,
	reelNumber : Number,
	questionNumber : Number,
	card_unique_id : { type: String, index: { unique: true } }
});

var CardModel = db.model('Card', CardSchema);
module.exports = CardModel;
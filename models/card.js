var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var cardSchema = new Schema({
	packageName : String,
	package_unique_id : String,
	package_price : Number,
	cardItem : {
		cardType : String,
		packageName : String,
		rightItem : Number,
		expression : String,
		blueItem : String,
		redItem : String,
		firstLine : String,
		lastLine : String,
		analysis : String,
		card_unique_id : String
	}
});

module.exports = mongoose.model('card', cardSchema);
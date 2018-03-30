var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var RankSchema = new Schema({
	todayList : Array,
	totalList : Array,
	date : Number
});

var RankModel = db.model('Rank', RankSchema);
module.exports = RankModel;
var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserOrderSchema = new Schema({
	openID : String,
	orderID : { type: String, index: { unique: true } },
	packageName : String,
	packagePrice : String,
	created_time : String
});

var UserOrderModel = db.model('UserOrder', UserOrderSchema);
module.exports = UserOrderModel;
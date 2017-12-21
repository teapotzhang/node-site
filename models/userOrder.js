var mongoose = require('mongoose');
var db = require('../db');
var Schema = mongoose.Schema;

var UserOrderSchema = new Schema({
	openID : String
});

var UserOrderModel = db.model('UserOrder', UserOrderSchema);
module.exports = UserOrderModel;
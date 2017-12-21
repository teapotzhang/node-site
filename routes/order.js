var express = require('express');
var request = require('request');
var Promise = require("bluebird");
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

//加载小程序package页面的时候，执行该路径
router.get('/', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户

    //获取openID 不暴漏用户
    var openID;

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作



    //调用微信的支付统一下单
    request.get({
      uri: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      json: true,
      qs: {
        grant_type: 'authorization_code',
        appid: 'wxf965e072652b2dc6',
        secret: 'e68999f635998f962f245ba78a6ba45d',
        js_code: code
      }
    }, (err, response, data) => {
      if (response.statusCode === 200) {
      	console.log(data);
      	var prepay_id = data.prepay_id;

      } else {
      	console.log("[error]", err);
      }

    });









    });
});

module.exports = router;
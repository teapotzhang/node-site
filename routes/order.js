var express = require('express');
var request = require('request');
var randomString = require('random-string');
var randomNumber = require('random-number');
var Promise = require("bluebird");
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var UserOrderModel = require('../models/userOrder');
var router = express.Router();

function dateObjToDateNumber(date_obj){
    var year = date_obj.getFullYear().toString();
    var month = (date_obj.getMonth() + 1).toString();
    var date_n = date_obj.getDate().toString();
  if( date_n < 10 ){
    date_n = '0' + date_n;
  }
  if( month < 10 ){
    month = '0' + month;
  }
  var result = year + month + date_n;
  result = parseInt(result);
  return result;
}

//加载小程序package页面的时候，执行该路径
router.get('/', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户
    var packageName = req.query.packageName; //确定用户下单的是哪个包
    var packagePrice; //确定下单金额
    //获取openID 不暴漏用户
    var openID;

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作

      PackageModel.findOne({ 'packageName' : packageName }, function(err, package){
        packagePrice = package['packageName'];
        var nonce_str = randomString({length: 32});
        var paySign;

        //生成商户订单
        var orderID = randomNumber({
          min : 100000,
          max : 999999,
          integer : true
        });

        var today_obj = new Date();
        var today_num = dateObjToDateNumber(today_obj);   
        
        orderID = today_num + orderID;  

        var data_json = {
          openID : openID,
          orderID : orderID,
          packageName : packageName,
          packagePrice : packagePrice,
          created_time : ''
        };

        var UserOrderEntity = new UserOrderModel(data_json);        
        UserEntity.save();

        //拼签名
        var stringA="appid=wxf965e072652b2dc6&body=法考小卡片"+packageName+"&device_info=WEB&mch_id=1492751112&nonce_str="+nonce_str+"&key=e68999f635998f962f245ba78a6ba45d";
        var sign = MD5(stringA);

        //调用微信的支付统一下单
        request.get({
          uri: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
          json: true,
          qs: {
            appid : 'wxf965e072652b2dc6',
            mch_id : '1492751112',
            device_info : "WEB",
            nonce_str : nonce_str,  //随机32位
            sign_type : 'MD5',
            body : '法考小卡片-' + packageName,
            notify_url : 'https://jiyikapian.com/order/notify',
            out_trade_no : orderID,  //自己的orderNumber
            spbill_create_ip : '140.143.136.128',
            total_fee : packagePrice,
            trade_type: 'JSAPI',
            sign : sign
          }
        }, (err, response, data) => {
          if (response.statusCode === 200) {
            console.log(data);
            var prepay_id = data.prepay_id;
            //返回支付参数和签名
            var str = 'prepay_id' + prepay_id;
            var timestamp = Date.parse(new Date()); //时间戳
            timestamp = (timestamp / 1000).toString();

            //又拼签名
            var stringB="appId=wxd678efh567hg6787&nonceStr="+nonce_str+"&package=" + str + "&signType=MD5&timeStamp=" + timestamp + "&key=qazwsxedcrfvtgbyhnujmikolp111111";
            var paySign = MD5(stringB);

            var return_json = {
              'timeStamp': timestamp,
              'nonceStr': nonce_str,
              'package': str,
              'paySign': paySign
            };
            var get_json = JSON.stringify(return_json);
            res.json(get_json);
            
          } else {
            console.log(err);
            console.log("[error]", err);
          }

        });

      });

    });
});


//收微信返回的数据
router.get('/notify', function(req, res, next){

});


module.exports = router;
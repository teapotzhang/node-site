var express = require('express');
var request = require('request');
var MD5 = require('md5');
var utf8 = require('utf8');
var WXPay = require('weixin-pay');
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

//package页面下单的时候，执行该路径
router.get('/', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户
    var packageName = req.query.packageName; //确定用户下单的是哪个包
    var packagePrice; //确定下单金额
    //获取openID 不暴漏用户
    var openID;

    var wxpay = WXPay({
        appid: 'wxf965e072652b2dc6',
        mch_id: '1492751112',
        partner_key: '1225fakaoxiaokapiankaishizhifule' //微信商户平台API密钥 
    });    

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作

      PackageModel.findOne({ 'packageName' : packageName }, function(err, package){
        packagePrice = package['packagePrice'];
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
        
        orderID = today_num.toString() + orderID.toString();  

        var data_json = {
          openID : openID,
          orderID : orderID,
          packageName : packageName,
          packagePrice : packagePrice,
          created_time : ''
        };

        var UserOrderEntity = new UserOrderModel(data_json);        
        UserOrderEntity.save();


        wxpay.createUnifiedOrder({
            body: '法考小程序' + packageName,
            openid : openID,
            out_trade_no: orderID,
            total_fee: packagePrice,
            spbill_create_ip: '140.143.136.128',
            notify_url: 'https://jiyikapian.com/order/notify',
            trade_type: 'JSAPI',
        }, function(err, data){
            console.log(data);
            var prepay_id = data.prepay_id;
            //返回支付参数和签名
            var str = 'prepay_id' + prepay_id;
            var timestamp = Date.parse(new Date()); //时间戳
            timestamp = (timestamp / 1000).toString();

            //又拼签名
            var stringB="appId=wxd678efh567hg6787&nonceStr="+nonce_str+"&package=" + str + "&signType=MD5&timeStamp=" + timestamp + "&key=1225fakaoxiaokapiankaishizhifule";
            var paySign = MD5(stringB);

            var return_json = {
              'timeStamp': timestamp,
              'nonceStr': nonce_str,
              'package': str,
              'paySign': paySign
            };
            var get_json = JSON.stringify(return_json);
            res.json(get_json);

        });

        //拼签名
        /*
        var stringA="appid=wxf965e072652b2dc6&body=法考小卡片"+packageName+"&device_info=WEB&mch_id=1492751112&nonce_str="+nonce_str+"&key=1225fakaoxiaokapiankaishizhifule";
        var sign = MD5(stringA);

        //调用微信的支付统一下单
        /*
        <xml>
        <appid>wxf965e072652b2dc6</appid>
        <mch_id>1492751112</mch_id>
        <body>法考小卡片- + packageName</body>
        <notify_url>https://jiyikapian.com/order/notify</notify_url>
        <out_trade_no>orderID</out_trade_no>
        <spbill_create_ip>140.143.136.128</spbill_create_ip>
        <total_fee>packagePrice</<total_fee>
        <trade_type>JSAPI</trade_type>
        <sign>sign</sign>
        <xml>
        */
        /*
        var body =  '<xml>' + 
                    '<appid>wxf965e072652b2dc6</appid>' + 
                    '<mch_id>1492751112</mch_id>' +
                    '<nonce_str>' + nonce_str + '</nonce_str>' +
                    '<body>' + '法考小卡片-' + packageName + '</body>' +
                    '<notify_url>https://jiyikapian.com/order/notify</notify_url>' +
                    '<out_trade_no>' + orderID + '</out_trade_no>' +
                    '<spbill_create_ip>140.143.136.128</spbill_create_ip>' +
                    '<total_fee>' + packagePrice + '</<total_fee>' +
                    '<trade_type>JSAPI</trade_type>' +
                    '<sign>' + sign + '</sign>' +
                    '</xml>';
        console.log(body);

        request.post({
          url:     'https://api.mch.weixin.qq.com/pay/unifiedorder',
          body:    body
        }, (err, response, data) => {
          if (response.statusCode === 200) {
            console.log(data);
            var prepay_id = data.prepay_id;
            //返回支付参数和签名
            var str = 'prepay_id' + prepay_id;
            var timestamp = Date.parse(new Date()); //时间戳
            timestamp = (timestamp / 1000).toString();

            //又拼签名
            var stringB="appId=wxd678efh567hg6787&nonceStr="+nonce_str+"&package=" + str + "&signType=MD5&timeStamp=" + timestamp + "&key=1225fakaoxiaokapiankaishizhifule";
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


      */
      });

    });
});


//收微信返回的数据
router.use('/notify', wxpay.useWXCallback(function(msg, req, res, next){
    // 处理商户业务逻辑 
    console.log(msg);
    console.log(req);
    // res.success() 向微信返回处理成功信息，res.fail()返回失败信息。 
    res.success();
}));


module.exports = router;
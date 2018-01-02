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
var CardModel = require('../models/card');
var UserPackageModel = require('../models/userPackage');
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

var wxpay = WXPay({
    appid: 'wxf965e072652b2dc6',
    mch_id: '1492751112',
    partner_key: 'a953b911c6e6d99917801490af0c20b4' //微信商户平台API密钥 
}); 

//package页面下单的时候，执行该路径
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
        packagePrice = package['packagePrice'];
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
          created_time : today_num,
          status : 'START'
        };

        var UserOrderEntity = new UserOrderModel(data_json);        
        UserOrderEntity.save();

        wxpay.createUnifiedOrder({
            body: '法考小程序' + packageName,
            attach: packageName,
            openid : openID,
            sign_type : 'MD5',
            out_trade_no: orderID,
            total_fee: packagePrice,
            spbill_create_ip: '140.143.136.128',
            notify_url: 'https://jiyikapian.com/order/notify',
            trade_type: 'JSAPI'
        }, function(err, data){
            var prepay_id = data.prepay_id;
            //返回支付参数和签名
            var str = 'prepay_id=' + prepay_id;
            var nonce_str = data.nonce_str;
            var timestamp = Date.parse(new Date()); //时间戳
            timestamp = parseInt(timestamp / 1000);

            //又拼签名
            var stringB="appId=wxf965e072652b2dc6&nonceStr="+nonce_str+"&package=" + str + "&signType=MD5&timeStamp=" + timestamp + "&key=1225fakaoxiaokapiankaishizhifule";
            var paySign = MD5(stringB).toUpperCase();
            var timeStamp = timestamp.toString();
            var return_json = {
              'timeStamp': timeStamp,
              'nonceStr': nonce_str,
              'package': str,
              'paySign': paySign
            };
            var get_json = JSON.stringify(return_json);
            res.json(get_json);

        });
      });

    });
});


//收微信返回的数据
router.use('/notify', wxpay.useWXCallback(function(msg, req, res, next){
    // 处理商户业务逻辑 
  if( msg.return_code == 'SUCCESS' && msg.result_code == 'SUCCESS'){
    //用户微信下单成功啦
    UserOrderModel.findOne({orderID : msg.out_trade_no}, function(err, order){
      var _id = order['_id'];
      if( order['status'] != 'SUCCESS' ){   //避免重复添加卡片
        var data_json = {
          'status': 'SUCCESS'
        };          
        UserOrderModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, userorders){
          UserPackageModel.find({'openID' : msg.openid, 'PackageName' : msg.attach}, function(err, userpackages){
            var _id = userpackages[0]._id;
            var data_json = {
              'Purchased' : true,
              'Activated' : true
            };

            UserPackageModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
              //更新userpackage后，更新usercard
              CardModel.find({'packageName' : msg.attach}, function(err, cards){                
                for( var j = 0; j< cards.length; j++){
                  var random_number = randomNumber({
                    min : 10000,
                    max : 99999,
                    integer : true
                  });
                  var data_json = {
                    card_unique_id : cards[j].card_unique_id,  //确定卡片的id
                    PackageName : cards[j].packageName, //卡片包
                    LastShowDate : 20000102,   //确定这张卡下次出现的时间
                    LastUpdateDate : 20000102,
                    openID : msg.openid,   //确定是谁
                    Showed: false,   //是否出现过
                    usedStatus: [],
                    randomNumber : random_number,
                    activated: true               
                  };
                  var UserCardEntity = new UserCardModel(data_json);
                  UserCardEntity.save();
                }
              });
            }); 
          });
        });
      }
    });      
  }
  else{
    UserOrderModel.findOne({orderID : msg.out_trade_no}, function(err, order){
      var _id = order['_id'];
      var data_json = {
        'status': 'FAILED'
      };                
      UserOrderModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, userorders){

      });
    });
  }
}));

router.get('/download', function(req, res, next){

  wxpay.download({
    bill_type : 'valid',
    start_time : '201801010100',
    end_time: '201801020000',
    page_num: 1,
    page_size: 100,
    version: '1.0'
  }, function(err, data){
    console.log(data);
  });

});

router.get('/query', function(req, res, next){
  wxpay.queryOrder({
    out_trade_no : '20180102532707'
  }, function(err, data){
    console.log(data);
  });
});

router.get('/refund', function(req, res, next){
  wxpay.queryRefundOrder({
    out_trade_no : '20180102532707'
  }, function(err, data){
    console.log(data);
  });
});

router.get('/refundquery', function(req, res, next){
  wxpay.queryRefundOrder({
    out_trade_no : '20180102532707'
  }, function(err, data){
    console.log(data);
  });
});


module.exports = router;
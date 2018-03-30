var express = require('express');
var Promise = require("bluebird");
var async = require('async');
var UserModel = require('../models/user');
var UserCardModel = require('../models/userCard');
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

function dateCompare(){
  var targetDate = new Date('2018/9/16');
  var today = new Date();

  var timeDiff = Math.abs(targetDate.getTime() - today.getTime());
  var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));  

  return diffDays;
}

function getTargetCents(openID, targetCents, cb){
  var today_number, total_cards, total_cards_set, today_need;
  var today_obj = new Date();
  var today_num = dateObjToDateNumber(today_obj);
  
  //用户今天刷了多少张卡
  UserCardModel.find({'openID' : openID, 'LastUpdateDate' : today_num}, function(err, cards){
    today_number = cards.length;

    //用户一共刷了多少张卡
    UserCardModel.find({'openID' : openID, 'Showed' : true}, function(err, cards){

      var total = 0;

      for( var i = 0; i < cards.length; i ++ ){
        total = cards[i]['usedStatus'].length + total;
      }

      total_cards = cards.length + total;

      //用户距离司考还有多少天
      var days = dateCompare();

      switch(parseInt(targetCents))
      {
      case 320:
        total_cards_set = 10000;
        break;
      case 360:
        total_cards_set = 25000;
        break;
      case 380:
        total_cards_set = 35000;
        break;
      default:
        total_cards_set = 50000;
      }

      today_need = Math.floor((total_cards_set - total_cards)/days);

      var number_json = {
        done : today_number,
        all : today_need,
        targetCents : targetCents,
        total_cards: total_cards
      }

      var get_json = JSON.stringify(number_json);
      cb(get_json);

    });

  });
}

//加载小程序首页的时候，执行该路径，获取今日刷的卡数，以及用户的目标分数
router.get('/', function(req, res, next){

  var sessionID = req.query.sessionID; //确定用户

  //获取openID 不暴漏用户
  var openID;

  UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
    console.log(user);
    openID = user['openID'];
    targetCents = user['targetCents'];
    //确保获取了user后，进行接下来的操作

    var card_json;

    var PromiseGetTargetCents = new Promise(function(resolve,reject){
      getTargetCents(openID, targetCents, function(result){
        resolve(result);
       });
    });

    PromiseGetTargetCents.then(function(result){
      card_json = result;
      res.json(card_json);
    });

  });  
});


//用户更改目标分数时，执行该路径
router.get('/upload_num', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户
    var targetCents = req.query.targetCents; //分数更改

    UserModel.find({'session_id' : sessionID}, function(err, users){
      var _id = users[0]._id;
      var data_json = {
        'targetCents' : targetCents
      };

      UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
        if (err) return handleError(err);

        var card_json;

        var PromiseGetTargetCents = new Promise(function(resolve,reject){
          getTargetCents(users[0].openID, targetCents, function(result){
            resolve(result);
           });
        });

        PromiseGetTargetCents.then(function(result){
          card_json = result;
          res.json(card_json);
        });        

      });     
    });
});

router.get('/getTotalArray', function(req, res, next){
  var total_array = [];
  var total_nick_array = [];
  UserModel.aggregate({$sample:{size:1500}}, function(err, users){
    async.each(users, function(user, callback){
      total_array.push(user['totalCards']);
      total_nick_array.push(user['nickName']);
      callback();
    }, function(results){
      total_array = JSON.stringify(total_array);
      res.json({'array':total_array,'nickname':total_nick_array});
    });
  });
});

router.get('/getTodayArray', function(req, res, next){
  var today_array = [];
  var today_obj = new Date();
  var today_num = dateObjToDateNumber(today_obj) - 1 ;  
  UserModel.find({lastUpdateTime:today_num}, null, {limit: 1500, sort: {todayCards: -1}}, function(err, users){
    async.each(users, function(user, callback){
      for( var i = 0; i < user['userCardRecord'].length; i++ ){
        if( user['userCardRecord'][i]['date'] == today_num ){
          if( user['userCardRecord']['cards'] > 0 ){
            today_array.push(user['todayCards']);
          }
        }
      }
      callback();
    }, function(results){
      today_array = JSON.stringify(today_array);
      res.json(today_array);
    });
  });
});

module.exports = router;
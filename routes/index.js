var express = require('express');
var Promise = require("bluebird");
var async = require('async');
var UserModel = require('../models/user');
var RankModel = require('../models/rank');
var UserCardModel = require('../models/userCard');
var randomNumber = require('random-number');
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
  var totalList = [];
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

      RankModel.find({'date':today_num},function(err, rankList){

        if( rankList.length == 0 ){
          RankModel.find({'date':today_num-1},function(err, rankListOld){
            totalList = totalList.concat(rankListOld[0]['totalList'])

            var rank = 0;

            for( var i = 0; i < totalList.length; i++ ){
              //这个人比他厉害，排他前面
              if( totalList[i] > total_cards ){
                rank ++;
              }
            }

            var percent = (totalList.length-rank)/totalList.length;

            if( percent > 0.9999 ){
              percent = 0.9999
            }

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
              total_cards_set = 30000;
              break;
            default:
              total_cards_set = 38000;
            }

            today_need = Math.floor((total_cards_set - total_cards)/days);

            var number_json = {
              done : today_number,
              all : today_need,
              targetCents : targetCents,
              total_cards: total_cards,
              percent : percent
            }

            var get_json = JSON.stringify(number_json);
            cb(get_json);
          });
        }
        else{
          totalList = totalList.concat(rankList[0]['totalList'])

          var rank = 0;

          for( var i = 0; i < totalList.length; i++ ){
            //这个人比他厉害，排他前面
            if( totalList[i] > total_cards ){
              rank ++;
            }
          }

          var percent = (totalList.length-rank)/totalList.length;

          if( percent > 0.9999 ){
            percent = 0.9999
          }

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
            total_cards_set = 30000;
            break;
          default:
            total_cards_set = 38000;
          }

          today_need = Math.floor((total_cards_set - total_cards)/days);

          var number_json = {
            done : today_number,
            all : today_need,
            targetCents : targetCents,
            total_cards: total_cards,
            percent : percent
          }

          var get_json = JSON.stringify(number_json);
          cb(get_json);
        }

      });

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

router.get('/getArray', function(req, res, next){
  var today_obj = new Date();
  var today_num = dateObjToDateNumber(today_obj);
  var todayList = [];
  var yesterday_num = today_num - 1;
  RankModel.find({'date':today_num},function(err, rankList){
    if( rankList.length == 0 ){
      //还没有今天的数据呢，取昨天的吧
      RankModel.find({'date':yesterday_num},function(err, rankListY){
        todayList = rankListY[0].todayList;
      })
    }
    else{
      todayList = rankList[0].todayList;
    }
    res.json({'today_array':todayList});
  }) 
});

module.exports = router;
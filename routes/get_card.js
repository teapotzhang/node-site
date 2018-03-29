var express = require('express');
var Promise = require("bluebird");
var async = require('async');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var UserPackageModel = require('../models/userPackage');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

function get_date_obj(year, month, date){
  var date_string = (year + '-' + month + '-' + date).toString();
  var date_obj = new Date(date_string);
  return date_obj;
}

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

function addDays(date, days) {
  var date_string = date.toString();
  var year = date_string.slice(0,4);
  var month = date_string.slice(4,6);
  var day = date_string.slice(6, 8);
  var date_obj = get_date_obj(year, month, day);
  date_obj.setDate(date_obj.getDate() + days);
  var result = dateObjToDateNumber(date_obj);
  return result;
}

function getNextCard(openID, cb){
    var today_obj = new Date();
    var today_num = dateObjToDateNumber(today_obj);
    var tomorrow = addDays( today_num, 1 );
    var today = addDays( today_num, 0);
    var card_json = {};
    var card_unique_id;
    var query = {
      openID : openID,
      LastShowDate : {
          $gt:  20000101,
          $lt:  tomorrow
      },
      LastUpdateDate: {
          $gt:  20000101,
          $lt:  today
      },
      activated : true
    };

    UserCardModel.find(query, null, {limit: 30, sort: {LastShowDate: -1, randomNumber: 1}}, function(err, new_user_cards) {
      if( new_user_cards.length == 0 ){
        //完全没卡能刷
        card_json = JSON.stringify([{
          lastCard: true
        }]);
        cb(card_json);
      }
      else{
        //有卡可以刷哦
        async.map(new_user_cards, function(user_new_card, callback){
          var card_unique_id = user_new_card.card_unique_id;
          var review_number = user_new_card.usedStatus.length;
          var usedStatus = user_new_card.usedStatus;
          CardModel.findOne({'card_unique_id': card_unique_id}, function(err, card){
            if(card){
              if(card.redItem == "" && card.expression == ""){
                callback(null, {'empty_card' : true});
              }
              else{
                var json = JSON.stringify(card)
                var card_json = {
                  packageName: card['packageName'],
                  SubPackageName : card['SubPackageName'],
                  packageType: card['cardType'],
                  firstLine: card['firstLine'],
                  lastLine: card['lastLine'],
                  blueItem: card['blueItem'],
                  redItem: card['redItem'],
                  blueRight: card['rightItem'] % 2,
                  analysis: card['analysis'],
                  expression : card['expression'],
                  yearNumber : card['yearNumber'],
                  reelNumber : card['reelNumber'],
                  questionNumber : card['questionNumber'],
                  card_unique_id : card_unique_id,
                  review_number : review_number,
                  usedStatus : usedStatus,
                  empty_card : false,
                  lastCard : false
                }
                callback(null, card_json);                
              }
            }
            else{
              callback(null, {'empty_card' : true});
            }
          });
        },function(err, results){
            for(var i=0,flag=true,len=results.length;i<len;flag ? i++ : i){
                    
               if( results[i]&&results[i].emptey_card==true ){
                    results.splice(i,1);
                    flag = false;
                } else {
                    flag = true;
                }

            }

          var t = JSON.stringify(results);
          cb(t);
        });       
      }
    });
}

router.get('/', function(req, res, next){

    var packageName;
    var sessionID = req.query.sessionID; //确定用户

    //获取openID 不暴漏用户
    var openID, card_unique_id, total_num, today_num, lastUpdateTime;
    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
    openID = user['openID'];
    total_num = user['totalCards'];
    today_num = user['todayCards'];
    lastUpdateTime = user['lastUpdateTime'];

    if(req.query.first_card == 'true'){
      //是当天的头一百张卡
      //去card表里查询卡的具体内容

      var card_json;
      var PromiseGetNextCard = new Promise(function(resolve,reject){   
        getNextCard(openID, function(result){   
          resolve(result);    
         });    
      });   
        
      PromiseGetNextCard.then(function(result){   
        card_json = result;        
        res.json(card_json);    
      });

    }
    else{
      //用户有回传的需要处理的数据

      //回传的用户刷卡详情数组
      var memoryData = JSON.parse(req.query.memoryData);

      var cardNum = memoryData.length;

      total_num = total_num + cardNum;

      var today_obj = new Date();
      var today_num = dateObjToDateNumber(today_obj);


      if( lastUpdateTime < today_num ){
        //今天刚刚开始刷卡
        today_num = cardNum;
        lastUpdateTime = today_num
      }
      else{
        today_num = today_num + cardNum;
      }

      UserModel.update({'openID' : openId}, {'todayCards': today_num, 'totalCards' : total_num, 'lastUpdateTime' : lastUpdateTime},{multi: true},function(err, user){

        async.each(memoryData, function(singleMemoryData, callback){

          var seconds = parseInt(singleMemoryData.seconds);
          var answerStatus = singleMemoryData.answerStatus;
          var card_unique_id = singleMemoryData.card_unique_id;
          var card_type = singleMemoryData.card_type;
          
          var tag;

          if( card_unique_id.length == 32 )
          {
            if( answerStatus == 'false' ){
              tag = 3; //回答错了
            } 
            else{
              if(card_type == "Exam")
              {
                if(seconds <= 20){
                  tag = 1; //简单
                }
                else{
                  tag = 2; //模糊
                }
              }
              if(card_type == "Normal")
              {
                if(seconds <= 8){
                  tag = 1; //简单
                }
                else{
                  tag = 2; //模糊
                }
              }   
              if(card_type == "Introduction"){
                 if(seconds <= 8){
                  tag = 1; //简单
                }
                else{
                  tag = 2; //模糊
                }         
              }     
            }
          }
          else{
            tag = 4;
          }

          UserCardModel.find({'card_unique_id' : card_unique_id, 'openID' : openID}, function(err, cards){
            //更新LastShowDate, LastUpdateDate和usedStatus
            var activate_flag;
            var LastShowDate = cards[0]['LastShowDate'];
            var date = LastShowDate;
            var NewShowDate;
            var NewArray = [];
            NewArray = cards[0]['usedStatus'].slice(0);
            var today_obj = new Date();
            var today_num = dateObjToDateNumber(today_obj);        
            NewUpdateDate = addDays(today_num, 0);        
            NewArray.push(tag);
            if( cards[0].Showed == false ){
              switch(tag) {
                  case 1:
                      date = addDays(today_num, 8);
                      NewShowDate = date;
                      activate_flag = true;
                      break; 
                  case 2:
                      date = addDays(today_num, 4);
                      NewShowDate = date;
                      activate_flag = true;
                      break;
                  case 3:
                      date = addDays(today_num, 2);
                      NewShowDate = date;
                      activate_flag = true;
                  case 4:
                      NewShowDate = 50000000;
                      activate_flag = false;
                      break;
              }          
            }
            else{
              for( var i = 0; i < NewArray.length; i++ ){
                switch(NewArray[i]) {
                    case 1:
                        //简单
                        date = addDays(date, 8);
                        NewShowDate = date;
                        activate_flag = true;
                        break;
                    case 2:
                        //模糊
                        date = addDays(date, 4);
                        NewShowDate = date;
                        activate_flag = true;
                        break;
                    case 3:
                        date = addDays(today_num, 2);
                        NewShowDate = date;
                        activate_flag = true;                      
                    case 4:
                        NewShowDate = 50000000;
                        activate_flag = false;
                        break;                      
                }              
              }
            }     
            
            var _id = cards[0]._id;
            var m_data_json = {
              card_unique_id : cards[0].card_unique_id,  
              LastShowDate : NewShowDate,   
              LastUpdateDate : NewUpdateDate, 
              openID : cards[0].openID,
              Showed: true,
              usedStatus: NewArray,
              activated: activate_flag
            };

            UserCardModel.findByIdAndUpdate(_id, { $set: m_data_json}, {new: false}, function(err, cards){
              if (err){
                console.log('err   ' + err);
              }
              callback();
            });        
          });
        }, function(err, results){
          //标记完后返回下一堆张卡
          var card_json;
          var PromiseGetNextCard = new Promise(function(resolve,reject){   
            getNextCard(openID, function(result){   
              resolve(result);    
             });    
          });   
            
          PromiseGetNextCard.then(function(result){   
            card_json = result;       
            res.json(card_json);    
          });
        });

      });
    }
    });  
});

module.exports = router;
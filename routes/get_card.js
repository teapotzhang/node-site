var express = require('express');
var Promise = require("bluebird");
var CardModel = require('../models/card');
var UserModel = require('../models/user');
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

    console.log(query);

    UserCardModel.findOne(query, null, {sort: {LastShowDate: -1}}, function(err, user_card) {
      console.log('user_card       ' + user_card);
    if( user_card == null )
    {
      //当天没有可以刷的卡了
      card_json = {
        lastCard: true
      }
      cb(card_json);
    }
    else
    {
      var card_unique_id = user_card.card_unique_id;
      CardModel.findOne({'card_unique_id': card_unique_id}, function(err, card){
        var json = JSON.stringify(card)
        card_json = {
          packageName: card['packageName'],
          packageType: card['cardType'],
          firstLine: card['firstLine'],
          lastLine: card['lastLine'],
          blueItem: card['blueItem'],
          redItem: card['redItem'],
          blueRight: card['rightItem'] % 2,
          analysis: card['analysis'],
          card_unique_id : card_unique_id,
          lastCard : false     
        }
        var get_json = JSON.stringify(card_json);
        console.log('card          '+card);
        console.log('json          '+json);
        console.log('card_json          '+card_json);
        console.log('get_json          '+get_json);
        cb(get_json);
      });
    }
  });
}

router.get('/', function(req, res, next){

    var packageName;
    var sessionID = req.query.sessionID; //确定用户

    //获取openID 不暴漏用户
    var openID, card_unique_id;
    console.log('sessionID            ' + sessionID);
    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
    console.log('user            ' + user);
    openID = user['openID'];



    console.log('first_card           ' + req.query.first_card);
    if(req.query.first_card == 'true'){
      //是当天的第一张卡，直接去UserCard里，找到该用户的第一张卡
      //去card表里查询卡的具体内容
      console.log('-----------------------------------------');

      var card_json;

      var PromiseGetNextCard = new Promise(function(resolve,reject){
        getNextCard(openID, function(result){
          resolve(result);
         });
      });

      PromiseGetNextCard.then(function(result){
        card_json = result;
        console.log(card_json);
        res.json(card_json);
      });
    }
    else{
      //不是当天的第一张卡，收到用户的刷卡情况，并且标记
      console.log('////////////////////////////////////////');
      
      var seconds = parseInt(req.query.seconds);
      var answerStatus = req.query.answerStatus;
      var card_unique_id = req.query.card_unique_id;
      var sessionID = req.query.sessionID;
      

      var tag;

      console.log('answer we get seconds' + seconds);
      console.log('answer we get answerStatus' + answerStatus);
      console.log('answer we get card_unique_id' + card_unique_id);
      console.log('answer we get sessionID' + sessionID);

      if( answerStatus == false ){
        tag = 3; //回答错了
      } 
      else{
        if(seconds <= 8){
          tag = 1; //简单
        }
        else{
          tag = 2; //模糊
        }

      }

      UserCardModel.find({'card_unique_id' : card_unique_id}, function(err, cards){
        //更新LastShowDate, LastUpdateDate和usedStatus
        var LastShowDate = cards[0]['LastShowDate'];
        var oldArray = cards[0]['usedStatus'];
        var date = LastShowDate;
        var NewShowDate;
        var today_obj = new Date();
        var today_num = dateObjToDateNumber(today_obj);        
        NewUpdateDate = addDays(today_num, 0);        
        var currentArray = oldArray.push(tag);
        if( cards[0].Showed == false ){
          switch(tag) {
              case 1:
                  date = addDays(today_num, 6);
                  NewShowDate = date;
                  break;
              case 2:
                  date = addDays(today_num, 2);
                  NewShowDate = date;
                  break;
              default:
                  date = addDays(today_num, 1);
                  NewShowDate = date;
          }          
        }
        else{
          for( var i = 0; i < currentArray.length; i++ ){
            switch(currentArray[i]) {
                case 1:
                    date = addDays(date, 3);
                    NewShowDate = date;
                    break;
                case 2:
                    date = addDays(date, 2);
                    NewShowDate = date;
                    break;
                default:
                    date = addDays(date, 1);
                    NewShowDate = date;
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
          usedStatus: currentArray,
          activated: true          
        };

        console.log(m_data_json);

        UserCardModel.findByIdAndUpdate(_id, { $set: m_data_json}, {new: false}, function(err, cards){
            if (err){
              console.log('err   ' + err);
            }

            //标记完后返回下一张卡
            var card_json;

            var PromiseGetNextCard = new Promise(function(resolve,reject){
              getNextCard(openID, function(result){
                resolve(result);
               });
            });

            PromiseGetNextCard.then(function(result){
              card_json = result;
              console.log(card_json + 'ddddddddddd');
              res.json(card_json);
            });


        });        
      });
    }
    });  
});

module.exports = router;
var express = require('express');
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

function getNextCard(openID){
    var today_obj = new Date();
    var today_num = dateObjToDateNumber(today_obj);
    var tomorrow = addDays( today_num, 1 );
    var today = addDays( today_num, 0);
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
      var card = {
        lastCard: true
      }
      return card;
    }
    else
    {
      var card_unique_id = user_card.card_unique_id;
      CardModel.findOne({'card_unique_id': card_unique_id}, function(err, card){
        var json = JSON.stringify(card);
        var card_json = {
          packageName: json.packageName,
          packageType: json.packageType,
          firstLine: json.firstLine,
          lastLine: json.lastLine,
          blueItem: json.blueItem,
          redItem: json.redItem,
          blueRight: json.rightItem % 2,
          analysis: json.analysis,
          card_unique_id : card_unique_id,
          lastCard : false     
        }
        console.log('json           '+json);
        console.log('card          '+card);
        console.log('card_json          '+card_json);
        return card_json;
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

    if(req.query.first_card){
      //是当天的第一张卡，直接去UserCard里，找到该用户的第一张卡
      //去card表里查询卡的具体内容
      var card_json = getNextCard(openID);
      res.json(card_json);
    }
    else{
      //不是当天的第一张卡，收到用户的刷卡情况，并且标记
      var data_json =  {
        seconds: req.query.seconds,
        answerStatus: req.query.answerStatus,
        card_unique_id: req.query.card_unique_id,
        sessionID: req.query.sessionID
      }

      var tag;

      if( answerStatus == false ){
        tag = 3; //回答错了
      } 
      else{
        if(data_json.seconds <= 8){
          tag = 1; //简单
        }
        else{
          tag = 2; //模糊
        }

      }

      UserCardModel.findOne({'card_unique_id' : card_unique_id}, function(err, card){
        //更新LastShowDate, LastUpdateDate和usedStatus
        var LastShowDate = card.LastShowDate;
        if( !card.Showed ){
          card.Showed = true;
          switch(tag) {
              case 1:
                  var date = addDays(LastShowDate, 6);
                  card.LastShowDate = date;
                  break;
              case 2:
                  var date = addDays(LastShowDate, 2);
                  card.LastShowDate = date;
                  break;
              default:
                  var date = addDays(LastShowDate, 1);
                  card.LastShowDate = date;
          }          
        }
        else{
          var currentArray = card.usedStatus.push(tag);
          for( var i = 0; i < currentArray.length; i++ ){
            switch(currentArray[i]) {
                case 1:
                    date = addDays(date, 3);
                    card.LastShowDate = date;
                    break;
                case 2:
                    date = addDays(date, 2);
                    card.LastShowDate = date;
                    break;
                default:
                    date = addDays(date, 1);
                    card.LastShowDate = date;
            }              
          }
        }
        card.usedStatus = currentArray;
        var today_obj = new Date();
        var today_num = dateObjToDateNumber(today_obj);        
        card.LastUpdateDate = addDays(today_num, 0);
        card.save();
      });

      //标记完后返回下一张卡
      var card_json = getNextCard(openID);
      res.json(card_json);

    }


    });  
});

module.exports = router;
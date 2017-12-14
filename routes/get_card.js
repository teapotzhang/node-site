var express = require('express');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

function addDays(date, days) {
  var date_string = toString(date);
  var year = date_string.slice(0,4);
  var month = date_string.slice(4,6);
  var day = date_string.slice(6, 8);
  var date_obj = get_date_obj(year, month, day);
  date_obj.setDate(date_obj.getDate() + days);
  var year = toString(date_obj.getFullYear());
  var month = toString(date_obj.getMonth() + 1);
  var date_n = toString(date_obj.getDate());
  if( date_n < 10 ){
    date_n = '0' + date_n;
  }
  if( month < 10 ){
    month = '0' + month;
  }
  result = year + month + date_n;
  result = parseInt(result);
  return result;
}

function get_date_obj(year, month, date){
  var date_string = year + '-' + month + '-' + date;
  var date_obj = new Date(date_string);
  return date_obj;
}

function getNextCard(openID){
    var tomorrow = addDays( new Date(), 1 );
    var today = addDays(new Date(), 0);
    var query = {openID : openID, 
      LastShowDate : {
          $gt:  20000101,
          $lt:  tomorrow
      },
      LastUpdateDate: {
          $gt:  20000101,
          $lt:  today
      },
      activated : true
    }

    UserCardModel.findOne(query, null, {sort: {lastShowDate: -1}}, function(err, user_card) {
    if( user_card === null )
    {
      //当天没有可以刷的卡了
      var card = {
        lastCard: true
      }
      return card;
    }
    else
    {
      card_unique_id = user_card.card_unique_id;
      CardModel.findOne({'card_unique_id': card_unique_id}, function(err, card){
        var card_json = {
          packageName: card.packageName,
          packageType: card.packageType,
          firstLine: card.firstLine,
          lastLine: card.lastLine,
          blueItem: card.blueItem,
          redItem: card.redItem,
          blueRight: card.rightItem % 2,
          analysis: card.analysis,
          card_unique_id : card_unique_id,
          lastCard : false     
        }
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
    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user.openID;
    });  

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
        card.LastUpdateDate = new Date().toISOString().split('T')[0];
        card.save();
      });

      //标记完后返回下一张卡
      var card_json = getNextCard(openID);
      res.json(card_json);

    }
});

module.exports = router;
var express = require('express');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  result = result.toISOString().split('T')[0];
  return result;
}

function getNextCard(openID){
    var tomorrow = addDays( new Date(), 1 );
    var query = {openID : openID, 
      LastShowDate : {
          $gt:  new Date('01 January 2000').toISOString().split('T')[0],
          $lt:  tomorrow
      },
      LastUpdateDate: {
          $gt:  new Date('01 January 2000').toISOString().split('T')[0],
          $lt:  new Date().toISOString().split('T')[0]
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
        var LastShowDate = new Date();
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
          var date = card.LastShowDate;
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
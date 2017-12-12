var express = require('express');
var CardModel = require('../models/card');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

router.get('/', function(req, res, next){

    var packageName;
    var sessionID = req.sessionID; //确定用户

    var startDate = moment(req.params.startTime).add('hours',7); //req.params.startTime = 2016-09-25 00:00:00
    var endDate   = moment(req.params.endTime).add('hours',7); //req.params.endTime = 2016-09-25 01:00:00

    //根据date排序

    UserCardModel.find({sessionID : sessionID, lastShowDate : {
        $gt:  new Date(2000, 0, 1).toISOString(),
        $lt:  new Date().toISOString()
    }}, null, {sort: {date: -1}}, function(err, user_cards) { 
      console.log(user_cards);
    });

    if(req.first_card){
      //是当天的第一张卡，直接去UserCard里，找到该用户的第一张卡
      UserCardModel.findOne({sessionID : sessionID}, function(err, card){

        var card_unique_id = card.card_unique_id;
        //去card表里查询卡的具体内容
        CardModel.find({card_unique_id: card_unique_id}, function(err, cards){
          var card_json = {
            packageName: card.packageName,
            packageType: card.packageType,
            firstLine: card.firstLine,
            lastLine: card.lastLine,
            blueItem: card.blueItem,
            redItem: card.redItem,
            blueRight: card.rightItem % 2,
            analysis: card.analysis,
            card_unique_id : card_unique_id       
          }
        });
      });
    }
    else{
      //不是当天的第一张卡，收到用户的刷卡情况，并且标记
      var data_json =  {
        seconds: req.seconds,
        answerStatus: req.answerStatus,
        card_unique_id: req.card_unique_id,
        sessionID: req.sessionID
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

      UserCardModel.findOne({card_unique_id : card_unique_id}, function(err, card){
        //更新LastShowDate和usedStatus
        for( var i = 0; i < card.usedStatus.length; i++ ){

        }
        card.usedStatus.push(tag);
        card.save();
      });

      //标记完后返回下一张卡

    }
});

module.exports = router;
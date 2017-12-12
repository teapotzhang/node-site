var express = require('express');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

router.get('/', function(req, res, next){

    var packageName;
    var sessionID = req.query.sessionID; //确定用户

    //获取openID 不暴漏用户
    var openID; 
    UserModel.findOne({ sessionID : sessionID }, function(err, user){
      openID = user.openID;
    });

    //根据date排序
    /*
    UserCardModel.find({openID : openID, lastShowDate : {
        $gt:  new Date(2000, 0, 1).toISOString(),
        $lt:  new Date().toISOString()
    }}, null, {sort: {date: -1}}, function(err, user_cards) { 
      console.log(user_cards);
    });
    */
    if(req.query.first_card){
      //是当天的第一张卡，直接去UserCard里，找到该用户的第一张卡
      UserCardModel.findOne({openID : openID}, function(err, card){

        var card_unique_id = card.card_unique_id;
        //去card表里查询卡的具体内容
        CardModel.findOne({card_unique_id: card_unique_id}, function(err, card){
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

      UserCardModel.findOne({card_unique_id : card_unique_id}, function(err, card){
        //更新LastShowDate和usedStatus
        for( var i = 0; i < card.usedStatus.length; i++ ){

        }
        card.usedStatus.push(tag);
        card.save();
      });

      //标记完后返回下一张卡

    }

    res.json(card_json);
});

module.exports = router;
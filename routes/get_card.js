var express = require('express');
var CardModel = require('../models/card');
var router = express.Router();

router.get('/', function(req, res, next){
    CardModel.find({}, function(err, cards){
      var context = {
        cards : cards.map(function(card){
          return{
            packageName : card.packageName,
            packagePrice : card.package_price,
            cardType : card.cardType,
            rightItem : card.rightItem,
            expression : card.expression,
            blueItem : card.blueItem,
            redItem : card.redItem,
            firstLine : card.firstLine,
            lastLine : card.lastLine,
            analysis : card.analysis,
            card_unique_id : card.card_unique_id
          }
        })
      }   
      res.json(context); 
    });
});

module.exports = router;
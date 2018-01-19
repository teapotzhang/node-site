var express = require('express');
var Promise = require("bluebird");
var async = require('async');
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserPackageModel = require('../models/userPackage');
var UserCardModel = require('../models/userCard');
var CardModel = require('../models/card');
var randomNumber = require('random-number');
var async = require('async');
var router = express.Router();

//加载小程序package页面的时候，执行该路径

function sortBy(field) {
    return function(a,b) {
        return  a[field] - b[field];
    }
}

router.get('/', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户

    //获取openID 不暴漏用户
    var openID;
    var array = [];

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作

      UserPackageModel.find({'openID' : openID}, function(err, userpackages){

        async.each(userpackages, function(card, cb){
          var price, packageId;
          var current_card = card;
          var thePackageName;
          PackageModel.find({'packageName' : current_card['PackageName']},function(err, packages){
            price = packages[0].packagePrice;
            packageId = packages[0].packageId;

            for( var i = 0; i < packages.length; i ++ ){
              if( current_card.SubPackageName == packages[i]['SubPackageName'] ){
                packageId = packages[i]['packageId'];
              }
            }

            if( current_card.PackageName.indexOf('真题') == -1 && current_card.PackageName.indexOf('介绍') == -1 ){
              thePackageName = current_card.PackageName + '知识点';
            }
            else{
              thePackageName = current_card.PackageName;
            }

            var data_json ={
              PackageName : thePackageName,
              SubPackageName : current_card.SubPackageName,
              Purchased : current_card.Purchased,
              Activated : current_card.Activated,
              packageId : packageId,
              PackagePrice : price
            };

            if(PackageName != '三分钟体验小卡片'){
              array.push(data_json); 
            }
            cb(null, data_json);
          });
        }, function(err, results){
          var new_array = [];
          array.sort(sortBy("packageId"));       
          res.json(array);
        });

      });

    });
});


//在package页面执行activate de-activate操作的时候，执行该路径，将卡片从userPackage userCard里标记为不激活
router.get('/activate_change', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户
    var packageName = req.query.packageName;
    var subPackageName = req.query.subPackageName;
    var activate_flag = req.query.activated.toString();

    if( packageName.indexOf('知识点') != -1 ){
      //是知识点卡片集合
      packageName = packageName.split('知识点')[0];
    }

    if( activate_flag == 'true' ){ activate_flag = true }else{ activate_flag = false };

    //获取openID 不暴漏用户
    var openID;

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作
      UserPackageModel.find({'openID' : openID, 'PackageName' : packageName, 'SubPackageName' : subPackageName}, function(err, userpackages){
        //先在userpackage里标注为不激活

        var _id = userpackages[0]._id;
        var data_json = {
          'Activated' : activate_flag
        };

        UserPackageModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
          //更新userpackage后，更新usercard
          var thequery = {'openID' : openID, 'PackageName' : packageName, 'SubPackageName' : subPackageName};

          UserCardModel.find(thequery, function(err, usercards){
            if(usercards.length === 0){
              
                CardModel.find({'packageName' : packageName, 'SubPackageName' : subPackageName}, function(err, cards){
                  async.each(cards, function(card, callback){
                    var random_number = randomNumber({
                          min : 10000,
                          max : 99999,
                          integer : true
                        });

                    var data_json = {
                        card_unique_id : card.card_unique_id,  //确定卡片的id
                        PackageName : card.packageName, //卡片包
                        SubPackageName : card.SubPackageName,  //子卡包
                        LastShowDate : 20000102,   //确定这张卡下次出现的时间
                        LastUpdateDate : 20000102,
                        openID : openID,   //确定是谁
                        Showed: false,   //是否出现过
                        usedStatus: [],
                        activated: true,
                        randomNumber : random_number
                      }
                    var UserCardEntity = new UserCardModel(data_json);
                    UserCardEntity.save(function(err, usercard){
                      callback();
                    });
                  },function(){
                    res.json({success: true});
                  });
                
                });
            }
            else{
              UserCardModel.update(thequery, {activated: activate_flag}, {multi: true},function(err) {
                if (err) return res.json(err);
                res.json({success: true});
              });
            }
          });
        });
        
      });
    });  
});

module.exports = router;
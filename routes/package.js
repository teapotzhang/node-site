var express = require('express');
var Promise = require("bluebird");
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserPackageModel = require('../models/userPackage');
var UserCardModel = require('../models/userCard');
var router = express.Router();

//加载小程序package页面的时候，执行该路径
router.get('/', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户

    //获取openID 不暴漏用户
    var openID;

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作

      UserPackageModel.find({'openID' : openID}, function(err, userpackages){
          var context = {
            userpackages : userpackages.map(function(card){
              var price;
              var current_card = card;
              console.log(current_card);
              PackageModel.find({'packageName' : current_card['PackageName']},function(err, packages){
                console.log('!!!!!!!!!!!!!!!!!!!!');
                console.log(current_card);
                price = packages[0].packagePrice;
                return{
                  PackageName : current_card.PackageName,
                  Purchased : current_card.Purchased,
                  Activated : current_card.Activated,
                  PackagePrice : price
                }                
              });
            })
          };


          
          res.json(context);
      });
    });
});


//在package页面执行activate de-activate操作的时候，执行该路径，将卡片从userPackage userCard里标记为不激活
router.get('/activate_change', function(req, res, next){
    var sessionID = req.query.sessionID; //确定用户
    var packageName = req.query.packageName;
    var activate_flag = req.query.activated.toString();
    if( activate_flag == 'true' ){ activate_flag = true }else{ activate_flag = false };

    //获取openID 不暴漏用户
    var openID;

    UserModel.findOne({ 'session_id' : sessionID }, function(err, user){
      openID = user['openID'];
      //确保获取了user后，进行接下来的操作
      UserPackageModel.find({'openID' : openID, 'PackageName' : packageName}, function(err, userpackages){
        //先在userpackage里标注为不激活

        var _id = userpackages[0]._id;
        var data_json = {
          'Activated' : activate_flag
        };

        UserPackageModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
          if (err) return res.json(err);

            //更新userpackage后，更新usercard

          UserCardModel.update({'openID' : openID, 'PackageName' : packageName}, {activated: activate_flag}, {multi: true},function(err) { 
              if (err) return res.json(err);
              res.json({success: true});
          });

        });
        
      });
    });  
});

module.exports = router;
var express = require('express');
var request = require('request');
var randomString = require('random-string');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserCardModel = require('../models/userCard');
var router = express.Router();

var user_open_id, user_session_key, sessionID;

router.get('/', function(req, res, next){

	//wechat user login, get code
	let code = req.query.code;
	sessionID = req.query.sessionID;

    if(sessionID.length != 32){
	    sessionID = randomString({length: 32});
    }

    request.get({
      uri: 'https://api.weixin.qq.com/sns/jscode2session',
      json: true,
      qs: {
        grant_type: 'authorization_code',
        appid: 'wxf965e072652b2dc6',
        secret: 'e68999f635998f962f245ba78a6ba45d',
        js_code: code
      }
    }, (err, response, data) => {
      if (response.statusCode === 200) {
        user_open_id = data.openid;
        user_session_key = data.session_key;
      } else {
        console.log("[error]", err)
        res.json(err)
      }
  })
  res.json({ sessionid: sessionID });
});

router.get('/add_user', function(req, res, next){
	let userInfo = JSON.parse(req.query.userInfo);
	var data_json = {
		'session_id': sessionID,
		'openID': user_open_id,
		'session_key': user_session_key,
		'nickName': userInfo.nickName,
		'gender': userInfo.gender,
		'avartar_url': userInfo.avatarUrl,
		'province': userInfo.province,
		'city': userInfo.city,
		'country': userInfo.country,
		'last_udpated': new Date()
	};
	var UserEntity = new UserModel(data_json);

	UserModel.find({'openID' : user_open_id}, function(err, users){
		if(users.length === 0){
			//是新用户
			UserEntity.save();
			//生成初始刷卡列表
			var init_packages = ['介绍','三国法'];
			for( var i = 0; i < init_packages.length; i++ ){
				PackageModel.find({'packageName' : init_packages[i]}, function(err, package){
					var package_id = package[0].package_unique_id;
					CardModel.find({'package_unique_id' : package_unique_id}, function(err, cards){
						for( var j = 0; j< cards.length; j++){
							var data_json = {
								card_unique_id : cards[j].card_unique_id,  //确定卡片的id
								LastShowDate : new Date(2000, 0, 2),   //确定这张卡下次出现的时间
								openID : user_open_id,   //确定是谁
								sessionID : sessionID,
								Showed: false,   //是否出现过
								usedStatus: [],
								activated: true								
							}
							var UserCardEntity = new UserCardModel(data_json);
							UserCardEntity.save();
						}
					});
				});
			}
		}
		else{
			var _id = users[0]._id;
		    UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: true}, function(err, cards){
		        if (err) return handleError(err);        
		    });			
		}
	});
});

module.exports = router;


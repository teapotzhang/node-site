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
    
		var data_json = {
			'session_id': sessionID,
			'openID': user_open_id,
			'session_key': user_session_key,
			'nickName': "",
			'gender': "",
			'avartar_url': "",
			'province': "",
			'city': "",
			'country': ""
		};

		var UserEntity = new UserModel(data_json);

		UserModel.find({'openID' : user_open_id}, function(err, users){
			if(users.length === 0){
				//是新用户
				UserEntity.save();
				//生成初始刷卡列表
				var init_packages = ['介绍','三国法'];
				for( var i = 0; i < init_packages.length; i++ ){
					CardModel.find({'packageName' : init_packages[i]}, function(err, cards){
						for( var j = 0; j< cards.length; j++){
							var data_json = {
								card_unique_id : cards[j].card_unique_id,  //确定卡片的id
								LastShowDate : 20000102,   //确定这张卡下次出现的时间
								LastUpdateDate : 20000102,
								openID : user_open_id,   //确定是谁
								Showed: false,   //是否出现过
								usedStatus: [],
								activated: true								
							};
							var UserCardEntity = new UserCardModel(data_json);
							UserCardEntity.save();
						}
					});
				}
			}
			else{
				//不是新用户 更新用户的sessionID以及别的信息
				var _id = users[0]._id;
			    UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: true}, function(err, cards){
			        if (err) return handleError(err);        
			    });			
			}
		});

		res.json({'sessionID' : sessionID, "openid" : user_open_id});


    });

});

router.get('/add_user', function(req, res, next){
	let userInfo = JSON.parse(req.query.userInfo);
	var sessionID = req.query.sessionID;

	UserModel.find({'session_id' : sessionID}, function(err, users){
		var _id = users[0]._id;

		var data_json = {
			'openID' : users[0].openID,
			'session_key' : users[0].session_key,
			'session_id': sessionID,
			'nickName': userInfo.nickName,
			'gender': userInfo.gender,
			'avartar_url': userInfo.avatarUrl,
			'province': userInfo.province,
			'city': userInfo.city,
			'country': userInfo.country
		};

	    UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
	        if (err) return handleError(err);
	    });			
	});
});

module.exports = router;


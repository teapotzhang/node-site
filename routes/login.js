var express = require('express');
var request = require('request');
var WXBizDataCrypt = require('../lib/WXBizDataCrypt')
var randomString = require('random-string');
var randomNumber = require('random-number');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var PackageModel = require('../models/package');
var UserPackageModel = require('../models/userPackage');
var UserCardModel = require('../models/userCard');
var router = express.Router();

var user_open_id, user_session_key, sessionID;

router.get('/', function(req, res, next){

	//wechat user login, get code
	let code = req.query.code;
	sessionID = req.query.sessionID.toString();

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
      	console.log(data);
        user_open_id = data.openid;
        user_session_key = data.session_key;

		UserModel.find({'openID' : user_open_id}, function(err, users){
			if(users.length === 0){
				//是新用户
				var data_json = {
					'session_id': sessionID,
					'openID': user_open_id,
					'session_key': user_session_key,
					'targetCents' : 380
				};

				var UserEntity = new UserModel(data_json);				
				UserEntity.save();
				
				var init_packages = ['三国法', '2017年真题卡包'];
				var not_init_packages = ['介绍'];

				//非初始卡包，需要购买激活
				for( var i = 0; i < not_init_packages.length; i++ ){
					
					var data_json = {
						PackageName : not_init_packages[i],
						Purchased : false,
						Activated : false,
						openID : user_open_id						
					}

					var UserPackageEntity = new UserPackageModel(data_json);
					UserPackageEntity.save();
				}	


				//生成初始刷卡列表
				for( var i = 0; i < init_packages.length; i++ ){
					PackageModel.find({packageName : init_packages[i]}, function(err, subpackages){  
						for(var j = 0; j < subpackages.length; j++){
							var data_json = {
								PackageName : init_packages[i],
								SubPackageName : subpackages[j]['SubPackageName'];
								Purchased : true,
								Activated : true,
								openID : user_open_id	
								var UserPackageEntity = new UserPackageModel(data_json);
								UserPackageEntity.save();
								CardModel.find({'packageName' : init_packages[i], 'SubPackageName' : subpackages[j]['SubPackageName']}, function(err, cards){
									for( var j = 0; j< cards.length; j++){
								        var random_number = randomNumber({
								          min : 10000,
								          max : 99999,
								          integer : true
								        });							
										var data_json = {
											card_unique_id : cards[j].card_unique_id,  //确定卡片的id
											PackageName : cards[j].packageName, //卡片包
											SubPackageName : cards[j].SubPackageName,  //子卡包
											LastShowDate : 20000102,   //确定这张卡下次出现的时间
											LastUpdateDate : 20000102,
											openID : user_open_id,   //确定是谁
											Showed: false,   //是否出现过
											usedStatus: [],
											activated: true,
											randomNumber : random_number
										};
										var UserCardEntity = new UserCardModel(data_json);
										UserCardEntity.save();
									}
								});								
							}							
						}
					});
				}
			}
			else{
				//不是新用户 更新用户的sessionID以及别的信息
				var _id = users[0]._id;
				var data_json = {
					'session_id': sessionID,
					'session_key': user_session_key
				};
			    UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
			        if (err) return handleError(err);        
			    });			
			}
		});

		res.json({'sessionID' : sessionID, "openid" : user_open_id});      


      } else {
        console.log("[error]", err);
        res.json(err);
      }

    });

});

router.get('/add_user', function(req, res, next){
	let userInfo = JSON.parse(req.query.userInfo);
	var encryptedData = req.query.encryptedData;
	var iv = req.query.iv;

	var sessionID = req.query.sessionID;

	UserModel.find({'session_id' : sessionID}, function(err, users){
		var _id = users[0]._id;
		var session_key = users[0].session_key;
		var appid = 'wxf965e072652b2dc6';

		var pc = new WXBizDataCrypt(appid, session_key);
		var data = pc.decryptData(encryptedData , iv);
		console.log(data);

		var data_json = {
			'unionID' : data['unionId'],
			'timestamp' : data['watermark']['timestamp'],
			'session_key' : users[0].session_key,
			'session_id': sessionID,
			'nickName': userInfo.nickName,
			'gender': userInfo.gender,
			'avartar_url': userInfo.avatarUrl,
			'province': userInfo.province,
			'city': userInfo.city,
			'country': userInfo.country,
			'targetCents' : users[0].targetCents
		};

	    UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
	        if (err) return handleError(err);
	    });			
	});
});

module.exports = router;


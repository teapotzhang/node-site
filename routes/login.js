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
var async = require('async');
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
				
				var init_packages = ['三分钟体验小卡片-', '介绍-', '三国法-国际经济法', '三国法-国际私法', '三国法-国际公法', '2017年真题包-'];
				var not_init_packages =['行政法-基础理论', '行政法-行政监督法', '行政法-行政行为法', '行政法-行政组织法', '民法-担保法', '民法-婚姻继承法', '民法-侵权责任法', '民法-物权法', '民法-债与合同法', '民法-总则', '2011至2016真题包-理论法', '2011至2016真题包-民法', '2011至2016真题包-民诉法', '2011至2016真题包-三国法', '2011至2016真题包-商经知', '2011至2016真题包-刑法', '2011至2016真题包-刑诉法', '2011至2016真题包-行政法', '理论法-法理学', '理论法-法制史' , '理论法-司法制度与法律职业道德', '理论法-宪法', '民诉法-和解调解执行程序', '民诉法-基本制度', '民诉法-诉讼非讼程序', '民诉法-仲裁制度', '商经知-经济法', '商经知-商法', '商经知-知识产权', '刑法-犯罪论', '刑法-其他分则罪', '刑法-侵犯财产罪', '刑法-侵犯人身民主权利罪', '刑法-刑罚论', '刑法-罪数', '刑诉法-基础理论','刑诉法-具体制度','刑诉法-诉讼阶段','刑诉法-特别程序及其他'];

				var whole_packages = init_packages.concat(not_init_packages);

				//非初始卡包，需要购买激活
				 for( var i = 0; i < not_init_packages.length; i++ ){
					var data_json = {
						PackageName : not_init_packages[i].split("-")[0],
						SubPackageName : not_init_packages[i].split("-")[1],
						Purchased : true,
						Activated : false,
						openID : user_open_id	
					}
					var UserPackageEntity = new UserPackageModel(data_json);
					UserPackageEntity.save();				
			    }

				//生成初始刷卡列表
				for( var i = 0; i < init_packages.length; i++ ){
					var data_json = {
						PackageName : init_packages[i].split("-")[0],
						SubPackageName : init_packages[i].split("-")[1],
						Purchased : true,
						Activated : true,
						openID : user_open_id	
					}
					var UserPackageEntity = new UserPackageModel(data_json);
					UserPackageEntity.save();
				}

				async.each(init_packages, function(whole_package, callback){
					CardModel.find({'packageName' : whole_package.split("-")[0], 'SubPackageName' : whole_package.split("-")[1]}, function(err, cards){
						async.each(cards, function(card, cb){
							var random_number;

							random_number = randomNumber({
					          min : 10000,
					          max : 99999,
					          integer : true
					        });

							if(card.initNumber != 0){
								random_number = card.initNumber;
							}

							var	data_json = {
								card_unique_id : card.card_unique_id,  //确定卡片的id
								PackageName : card.packageName, //卡片包
								SubPackageName : card.SubPackageName,  //子卡包
								LastShowDate : 20000102,   //确定这张卡下次出现的时间
								LastUpdateDate : 20000102,
								openID : user_open_id,   //确定是谁
								Showed: false,   //是否出现过
								usedStatus: [],
								activated: true,
								randomNumber : random_number
							}
							
							var UserCardEntity = new UserCardModel(data_json);
		                    UserCardEntity.save(function(err, usercard){
		                      cb();
		                    });
						}, function(){
							callback();
						});
					});

				}, function(err){
					res.json({'sessionID' : sessionID});
				});

			}
			else{
				//不是新用户 更新用户的sessionID以及别的信息
				var _id = users[0]._id;
				var data_json = {
					'session_id': sessionID,
					'session_key': user_session_key
				};
			    UserModel.findByIdAndUpdate(_id, { $set: data_json}, {new: false}, function(err, cards){
			    	res.json({'sessionID' : sessionID});
			    });
			}
		});

      } else {
        res.json({'fail':true});
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
	        if (err) return console.log(err);
	        res.json({'success' : true}); 
	    });			
	});
});

module.exports = router;


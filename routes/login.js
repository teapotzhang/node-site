var express = require('express');
var request = require('request');
var randomString = require('random-string');
var UserModel = require('../models/user');
var router = express.Router();

var user_open_id, user_session_key, sessionID;

router.get('/', function(req, res, next){

	//wechat user login, get code
	let code = req.query.code;
	sessionID = req.query.sessionID;

    if(sessionID == null){
	    sessionID = randomString({length: 32});
	    res.json({ sessionid: sessionID });        	
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
        console.log("[openid]", data.openid);
        console.log("[session_key]", data.session_key);
        user_open_id = data.openid;
        user_session_key = data.session_key;
      } else {
        console.log("[error]", err)
        res.json(err)
      }
  })

});

router.get('/add_user', function(req, res, next){
	let userInfo = req.query.userInfo;
	var UserEntity = new UserModel({
		session_id: sessionID,
		openID: user_open_id,
		session_key: user_session_key,
		nickName: userInfo.nickName,
		gender: userInfo.gender,
		avartar_url: userInfo.avatarUrl,
		address : {
			province: userInfo.province,
			city: userInfo.city,
			country: userInfo.country
		},
		last_udpated: new Date()
	});

	UserModel.find({openID : user_open_id}, function(err, users){
		if(users.length === 0){
			UserEntity.save();
		}
		else{
			//用户信息存在
		}
	});
});

module.exports = router;


var express = require('express');
var app = express();
var User = require('./models/user');
var router = express.Router();

const exec = require('child_process').exec;

function get_session_id(){
	exec('head -n 80 /dev/urandom | tr -dc A-Za-z0-9 | head -c 168', function(err,stdout,stderr){
		return sessionid;
	});
};

router.get('/login', function(req, res, next){
	//wechat user login, get code
	let code = req.query.code;

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
        console.log("[openid]", data.openid)
        console.log("[session_key]", data.session_key)

        //TODO: 生成一个唯一字符串sessionid作为键，将openid和session_key作为值，存入redis，超时时间设置为2小时
        //伪代码: redisStore.set(sessionid, openid + session_key, 7200)

        var sessionid = get_session_id();

        res.json({ sessionid: sessionid })
      } else {
        console.log("[error]", err)
        res.json(err)
      }
  })

});

module.exports = router;


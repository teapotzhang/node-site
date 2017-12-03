const exec = require('child_process').exec;

var express = require('express');

var app = express();

var handlebars = require('express3-handlebars')
				.create({ defaultLayout : 'main' });

function get_session_id(){
	exec('head -n 80 /dev/urandom | tr -dc A-Za-z0-9 | head -c 168', function(err,stdout,stderr){
		return stdout;
	});
};


app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 8080);

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next){
	res.locals.showTests = app.get('env') !== 'production' &&
			req.query.test == '1';
	next();
});

//路由设置

app.get('/', function(req, res){
	res.render('home');
});

app.get('/login', function(req, res, next){
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

app.use(function(req, res){
	res.status(404);
	res.render('404');
});

app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
	console.log('Express started on http://localhost:' +  app.get('port') + '; press Ctrl -C to terminate.');
});

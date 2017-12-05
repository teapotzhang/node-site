var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var fileUpload = require('express-fileupload');
var app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(cookieParser());

app.use(fileUpload());

app.use(session({
	secret: 'anystringoftext',
	saveUninitialized: true,
	resave: true
}));

var login = require('./routes/login');
var admin = require('./routes/admin');

var handlebars = require('express3-handlebars')
				.create({ defaultLayout : 'main' });

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

app.use('/login', login);
app.use('/admin', admin);

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

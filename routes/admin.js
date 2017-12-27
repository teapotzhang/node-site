var express = require('express');
var AdminModel = require('../models/admin');
var CardModel = require('../models/card');
var PackageModel = require('../models/package');
var csv = require('csvtojson');
var randomString = require('random-string');
var router = express.Router();

var sess;

function get_line(whole_line){
  var _whole_line = whole_line || "#";
  var k = _whole_line.split('#');
  return k; 
}

router.get('/login', function(req, res, next){

  sess = req.session;
  if(sess.authenticated){
    return res.redirect('/admin/index');
  }
  else{
    return res.render('admin/login');
  }
  return res.render('admin/login');

});

router.post('/login', function(req,res, next){
  
  sess = req.session;
  AdminModel.find({username: req.body.username}, function(err, admins){
    if (admins.length === 0){
      console.log('no exist');
      return;
    }else{
      if(admins[0].password === req.body.password){
        sess.authenticated = true;
        return res.redirect('/admin/index');        
      }
      else{
        console.log('wrong password');
      }
    }
  });
});

// Logout endpoint
//app.get('/logout', function (req, res) {
  //req.session.destroy();
  //res.send("logout success!");
//});
 
// Get content endpoint
router.get('/index', function (req, res) {
   sess = req.session;
   if( sess.authenticated ){
    return res.render('admin/index'); 
   }
   else{
      return res.redirect('/admin/login');
   }

});

router.post('/index', function(req, res){

  let cardFile = req.files.cardFile;

  if(!req.files)
    return res.status(400).send('没上传文件哦');

  if( cardFile.name.indexOf('.csv') == -1 ){
    return res.status(400).send('上传的文件不是.csv哦');
  }

  var file_link = './card_lib/' + cardFile.name;

  cardFile.mv(file_link, function(err){
    if (err)
      return res.status(500).send(err);
  });

  csv()
    .fromFile(file_link)
    .on("end_parsed" , function(jsonArrayobj){

      var packagename = cardFile.name.split(".")[0];

      PackageModel.find({packageName : packagename}, function(err, packages){
        if( packages.length === 0 ){
          var data_json = {
            packageName : packagename,
            packagePrice : 0.00,
            packageId : packageId
          };

          var PackageEntity = new PackageModel(data_json);
          PackageEntity.save();            
        }
      });

      var i = 0;

      while(i < jsonArrayobj.length){

        //定义卡片项
        var cardType;
        var firstLine = ""; 
        var lastLine = "";
        var expression = ""; 
        var yearNumber = ""; 
        var reelNumber = "";
        var questionNumber = "";
        var blueItem = "";
        var redItem = "";
        var analysis = "";
        var card_unique_id = packagename + '_' + i;
        var rightItem = jsonArrayobj[i].rightItem;          

        if(jsonArrayobj[i].hasOwnProperty('whole_line')){
          var k = get_line(jsonArrayobj[i].whole_line);
          firstLine = k[0];
          lastLine = k[1];
          blueItem = jsonArrayobj[i].blueItem;
          redItem = jsonArrayobj[i].redItem;          
          cardType = 'Normal';        
        }

        else if(jsonArrayobj[i].hasOwnProperty('expression')){
          expression = jsonArrayobj[i].expression;
          yearNumber = parseInt(jsonArrayobj[i].yearNumber);
          reelNumber = jsonArrayobj[i].reelNumber;
          questionNumber = parseInt(jsonArrayobj[i].questionNumber);
          cardType = 'Exam';
        }

        if( packagename.indexOf('介绍') != -1){
          cardType = 'Introduction';
        }      

        if(jsonArrayobj[i].hasOwnProperty('analysis')){
          analysis = jsonArrayobj[i].analysis;
        }

        var data_json = {
          'packageName' : packagename,
          'cardType' : cardType,
          'rightItem' : rightItem,
          'expression' : expression,
          'blueItem' : blueItem,
          'redItem' : redItem,
          'firstLine' : firstLine,
          'lastLine' : lastLine,
          'analysis' : analysis,
          'yearNumber' : yearNumber,
          'reelNumber' : reelNumber,
          'questionNumber' : questionNumber,            
          'card_unique_id' : card_unique_id
        };

        var CardEntity = new CardModel(data_json);
        CardEntity.save();

        i++;
      }

    });

    return res.render('admin/index')
});

router.get('/index/search', function(req, res){
    var search_key = req.query.searchKey;
    CardModel.find({card_unique_id : search_key}, function(err, cards){
      var context = {
        cards : cards.map(function(card){
          return{
            packageName : card.packagename,
            cardType : card.cardType,
            rightItem : card.rightItem,
            expression : card.expression,
            blueItem : card.blueItem,
            redItem : card.redItem,
            firstLine : card.firstLine,
            lastLine : card.lastLine,
            analysis : card.analysis,
            yearNumber : card.yearNumber,
            reelNumber : card.reelNumber,
            questionNumber : card.questionNumber,             
            card_unique_id : card.card_unique_id
          }
        })
      }
      return res.render('admin/index', context); 
    });
});

router.get('/index/update', function(req, res){

    var k = get_line(req.query.whole_line);

    var data_json = {
      'rightItem' : req.query.rightItem,
      'expression' : req.query.expression,
      'blueItem' : req.query.blueItem,
      'redItem' : req.query.redItem,
      'firstLine' : k[0],
      'lastLine' : k[1],
      'analysis' : req.query.analysis
    };

    CardModel.find({card_unique_id : req.query.card_unique_id}, function(err, cards){
    if(cards.length === 0){
      return res.render('admin/index');
    }
    else{
      var _id = cards[0]._id;

      data_json = {
        'rightItem' : req.query.rightItem || cards[0].rightItem,
        'expression' : req.query.expression || cards[0].expression,
        'blueItem' : req.query.blueItem || cards[0].blueItem,
        'redItem' : req.query.redItem || cards[0].redItem,
        'firstLine' : k[0] || cards[0].firstLine,
        'lastLine' : k[1] || cards[0].lastLine,
        'analysis' : req.query.analysis  || cards[0].analysis
      };

      CardModel.findByIdAndUpdate(_id, { $set: data_json}, {new: true}, function(err, cards){
        if (err) return handleError(err);        
      });
    }

    return res.render('admin/index');

    });

});

router.get('/index/update/package', function(req, res){

    var data_json = {
      'packageName' : req.query.packageName,
      'packageId' : req.query.packageId,
      'packagePrice' : req.query.packagePrice
    };

    PackageModel.find({packageName : req.query.packageName}, function(err, packages){
    if(packages.length === 0){
      return res.render('admin/index');
    }
    else{
      var _id = packages[0]._id;

      data_json = {
        'packageName' : req.query.packageName || packages[0].rightItem,
        'packagePrice' : req.query.packagePrice || packages[0].packagePrice,
        'packageId' : req.query.packageId || packages[0].packageId
      };

      PackageModel.findByIdAndUpdate(_id, { $set: data_json}, {new: true}, function(err, packages){
        if (err) return handleError(err);        
      });
    }

    return res.render('admin/index');

    });

});

router.get('/index/search/package', function(req, res){
    var search_key = req.query.searchKey;
    console.log(search_key);
    PackageModel.find({packageName : search_key}, function(err, packages){
      var context = {
        packages : packages.map(function(package){
          return{
            packageName : package.packageName,
            packagePrice : package.packagePrice,
            packageId : package.packageId
          }
        })
      }
      return res.render('admin/index', context); 
    });
});


module.exports = router;
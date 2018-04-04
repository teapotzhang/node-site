var express = require('express');
var async = require('async');
var RankModel = require('../models/rank');
var AdminModel = require('../models/admin');
var CardModel = require('../models/card');
var UserModel = require('../models/user');
var UserCardModel = require('../models/userCard');
var UserPackageModel = require('../models/userPackage');
var PackageModel = require('../models/package');
var csv = require('csvtojson');
var randomString = require('random-string');
var randomNumber = require('random-number');
var nowDate = require('silly-datetime');
var router = express.Router();

var sess;

function get_line(whole_line){
  var _whole_line = whole_line || "#";
  var k = _whole_line.split('#');
  return k; 
}

function dateObjToDateNumber(date_obj){
    var year = date_obj.getFullYear().toString();
    var month = (date_obj.getMonth() + 1).toString();
    var date_n = date_obj.getDate().toString();
    if( date_n < 10 ){
      date_n = '0' + date_n;
    }
    if( month < 10 ){
      month = '0' + month;
    }
    var result = year + month + date_n;
    result = parseInt(result);
    return result;
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
    PackageModel.find(function(err, packages){
      var  context = {
        packages : packages.map(function(package){
          return{
            packageName : package.packageName,
            subPackageName : package.SubPackageName
          }
        })
      }
      return res.render('admin/index', context);  
    });
   }
   else{
      return res.redirect('/admin/login');
   }
});

router.get('/index_package', function(req, res){
   sess = req.session;
   if( sess.authenticated ){
    return res.render('admin/index_package'); 
   }
   else{
      return res.redirect('/admin/login');
   }
});

router.post('/index_package', function(req, res){

  console.log('posting');

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

      //读取.csv文件
      var packagename_whole = cardFile.name.split(".")[0];
      var packagename, subpackagename;
      var packageId = 0;

      if( packagename_whole.indexOf('-') == -1 ){
        //这是一个独立的卡包
        packagename = packagename_whole;
        subpackagename = '';
      }
      else{
        //它是集合中的卡包
        packagename = packagename_whole.split("-")[0];
        subpackagename = packagename_whole.split("-")[1];
      }

      PackageModel.find({packageName : packagename, SubPackageName : subpackagename}, function(err, packages){
        //这是一个没出现过的集合
        if( packages.length === 0 ){
          var data_json = {
            packageName : packagename,
            SubPackageName : subpackagename,
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

        var card_unique_id = randomString({length: 32});

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

        if(jsonArrayobj[i].hasOwnProperty('initNumber')){
          //事先规定好了顺序，不能随意更改的
          var initNumber = jsonArrayobj[i].initNumber;
          card_unique_id = randomString({length: 16});
          if( jsonArrayobj[i].whole_line == "" ){
            cardType = 'Exam';
            expression = jsonArrayobj[i].expression;
            yearNumber = parseInt(jsonArrayobj[i].yearNumber);
            reelNumber = jsonArrayobj[i].reelNumber;
            questionNumber = parseInt(jsonArrayobj[i].questionNumber);            
          }

          var data_json = {
            'packageName' : packagename,
            'SubPackageName' : subpackagename,  //卡片属于哪个子卡包
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
            'initNumber' : initNumber,
            'card_unique_id' : card_unique_id
          };

          var CardEntity = new CardModel(data_json);
          CardEntity.save();

        }

        else{

          var data_json = {
            'packageName' : packagename,
            'SubPackageName' : subpackagename,  //卡片属于哪个子卡包
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

        }

        i++;
      }

    });

    return res.render('admin/index_package')
});

router.get('/index/search', function(req, res){
    var search_key = req.query.searchKey;

    CardModel.find({"$or": [ {"expression": {$regex:search_key} }, {"blueItem": {$regex:search_key} },{"redItem": {$regex:search_key} },{"firstLine": {$regex:search_key} },{"lastLine": {$regex:search_key} } ]},null,{limit:20} ,function(err, cards){
      
    PackageModel.find(function(err, packages){
      var  context = {
         cards : cards.map(function(card){
          return{
            packageName : card.packageName,
            SubPackageName : card.SubPackageName,
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
        }),       
        packages : packages.map(function(package){
          return{
            packageName : package.packageName,
            subPackageName : package.SubPackageName
          }
        })
      }
      return res.render('admin/index', context);  
    });
    });
});

router.get('/index/searchPackage', function(req, res){
    var search_key = req.query.searchKey;
    CardModel.find({"packageName": search_key},null,function(err, cards){
      PackageModel.find(function(err, packages){
      var context = {
        cards : cards.map(function(card){
          return{
            packageName : card.packageName,
            SubPackageName : card.SubPackageName,            
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
        }),       
        packages : packages.map(function(package){
          return{
            packageName : package.packageName,
            subPackageName : package.SubPackageName
          }
        })        
      }
      return res.render('admin/index', context);
    });
    });
});

router.get('/index/searchFormPackageCardNumber', function(req, res){

    var search_key_1 = req.query.packageName.split('-')[0];
    var search_key_2 = req.query.packageName.split('-')[1];

    CardModel.find({"packageName": search_key_1, "SubPackageName": search_key_2},function(err, cards){
      
      var cardsNumber = cards.length;
      
      PackageModel.update({"packageName": search_key_1, "SubPackageName": search_key_2}, { 'packageCardNumber' : cardsNumber}, function(err, package) {
        
        PackageModel.find(function(err, packages){
          var  context = {
            packages : packages.map(function(package){
              return{
                packageName : package.packageName,
                subPackageName : package.SubPackageName
              }
            })
          }
          return res.render('admin/index', context);  
        });

      });

    });
});

router.get('/index/new', function(req, res){
  PackageModel.find(function(err, packages){
    var context = {
      packages : packages.map(function(package){
        return{
          packageName : package.packageName,
          subPackageName : package.SubPackageName
        }
      })
    } 
    return res.render('admin/new', context);
  });
});

router.post('/index/new', function(req, res){

    var card_unique_id = randomString({length: 32});

    var packagename = req.body.packageName.split("-")[0];
    var subpackagename = req.body.packageName.split("-")[1];

    var data_json = {
      'packageName' : packagename,
      'SubPackageName' : subpackagename,      
      'rightItem' : req.body.rightItem,
      'cardType' : req.body.cardType,
      'expression' : req.body.expression,
      'blueItem' : req.body.blueItem,
      'redItem' : req.body.redItem,
      'firstLine' : req.body.firstLine,
      'lastLine' : req.body.lastLine,
      'analysis' : req.body.analysis,
      'yearNumber' : req.body.yearNumber,
      'reelNumber' : req.body.reelNumber,
      'questionNumber' : req.body.questionNumber,
      'card_unique_id' : card_unique_id
    };

    if( packagename.indexOf('三分钟') != -1 ){
      //是三分钟体验卡包，需要获取initNumber
      CardModel.find({packageName : '三分钟体验小卡片'}, function(err, cards){
        var max_num = 1;
        for( var i = 0; i < cards.length; i++ ){
          if( cards[i].initNumber > max_num ){
            max_num = cards[i].initNumber;
          }
        }
        max_num = max_num + 1;
        var init_number = max_num;

        card_unique_id = randomString({length: 16});

        var data_json = {
          'packageName' : packagename,
          'SubPackageName' : subpackagename,      
          'rightItem' : req.body.rightItem,
          'cardType' : req.body.cardType,
          'expression' : req.body.expression,
          'blueItem' : req.body.blueItem,
          'redItem' : req.body.redItem,
          'firstLine' : req.body.firstLine,
          'lastLine' : req.body.lastLine,
          'analysis' : req.body.analysis,
          'yearNumber' : req.body.yearNumber,
          'reelNumber' : req.body.reelNumber,
          'questionNumber' : req.body.questionNumber,
          'card_unique_id' : card_unique_id,
          'initNumber' :  max_num
        }

        var CardEntity = new CardModel(data_json);
        CardEntity.save();

        res.json({'success': true})

      });
    }
    else{
      var data_json = {
        'packageName' : packagename,
        'SubPackageName' : subpackagename,      
        'rightItem' : req.body.rightItem,
        'cardType' : req.body.cardType,
        'expression' : req.body.expression,
        'blueItem' : req.body.blueItem,
        'redItem' : req.body.redItem,
        'firstLine' : req.body.firstLine,
        'lastLine' : req.body.lastLine,
        'analysis' : req.body.analysis,
        'yearNumber' : req.body.yearNumber,
        'reelNumber' : req.body.reelNumber,
        'questionNumber' : req.body.questionNumber,
        'card_unique_id' : card_unique_id
      }

      var CardEntity = new CardModel(data_json);
      CardEntity.save();

      var random_number = randomNumber({
              min : 10000,
              max : 99999,
              integer : true
            });

      UserPackageModel.find({ PackageName : packagename, SubPackageName : subpackagename }, function(err, users){
        async.each(users, function(user, callback){

          UserCardModel.findOne({PackageName : packagename, SubPackageName : subpackagename, openID : user.openID},function(err, usercards){
            if(usercards){
              var new_json = {
                card_unique_id : card_unique_id,  //确定卡片的id
                PackageName : packagename, //确定卡包
                SubPackageName : subpackagename, //确定子卡包
                LastShowDate : 20000102,   //确定这张卡下次出现的时间
                LastUpdateDate : 20000102, //确定最后一次这张卡背诵的时间
                openID : user.openID,   //确定是谁
                Showed: false,   //是否出现过
                usedStatus: [],
                randomNumber : random_number,
                activated: user.Activated        
              }
              var UserCardEntity = new UserCardModel(new_json);
              UserCardEntity.save(function(){
                callback();
              });                     
            }
            else{
              callback();
            }
          });

        }, function(err, results){
          //该卡包所有卡片数量增加1
          res.json({'success': true});
        });
      
      });
    }

});



router.get('/index/update', function(req, res){
  return res.render('admin/update_form');
});

router.get('/index/delete', function(req, res){
  CardModel.remove({card_unique_id : req.query.card_unique_id}, function(err, cards){
    console.log(cards);

    UserCardModel.remove({card_unique_id : req.query.card_unique_id}, function(err, cards){
      if(err)
      {
        return res.json({'status':'fail'})
      }
      else{
        //把卡包里面卡片数量减1
        return res.json({'status':'success'});
      }
    });

  }); 
});

router.post('/index/update', function(req, res){

    var data_json = {
      'rightItem' : req.body.rightItem,
      'expression' : req.body.expression,
      'blueItem' : req.body.blueItem,
      'redItem' : req.body.redItem,
      'firstLine' : req.body.firstLine,
      'lastLine' : req.body.lastLine,
      'analysis' : req.body.analysis
    };

    CardModel.find({card_unique_id : req.query.card_unique_id}, function(err, cards){
        if(cards.length === 0){
          return res.render('admin/index');
        }
        else{
          var _id = cards[0]._id;
          var package_json = {
            'packageName' : cards[0].packageName,
            'SubPackageName' : cards[0].SubPackageName
          };

          data_json = {
            'rightItem' : req.body.rightItem || cards[0].rightItem,
            'expression' : req.body.expression || cards[0].expression,
            'blueItem' : req.body.blueItem || cards[0].blueItem,
            'redItem' : req.body.redItem || cards[0].redItem,
            'firstLine' : req.body.firstLine || cards[0].firstLine,
            'lastLine' : req.body.lastLine || cards[0].lastLine,
            'analysis' : req.body.analysis  || cards[0].analysis,
            'yearNumber' : req.body.yearNumber || cards[0].yearNumber,
            'reelNumber' : req.body.reelNumber || cards[0].reelNumber,
            'questionNumber' : req.body.questionNumber || cards[0].questionNumber 
          };

          nowDate.locate('zh-cn');
          var lastUpdatedTime = nowDate.format(new Date(), 'YYYY-MM-DD');
          console.log(lastUpdatedTime);

          PackageModel.update(package_json, { 'packageUpdateTime' : lastUpdatedTime }, function(err, package) {

            CardModel.findByIdAndUpdate(_id, { $set: data_json}, function(err, cards){
              CardModel.find({card_unique_id : req.query.card_unique_id}, function(err, cards){
                PackageModel.find(function(err, packages){
                  var  context = {
                  cards : cards.map(function(card){
                    return{
                      packageName : card.packageName,
                      SubPackageName : card.SubPackageName,
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
                    }),                    
                    packages : packages.map(function(package){
                      return{
                        packageName : package.packageName,
                        subPackageName : package.SubPackageName
                      }
                    })
                  }
                  return res.render('admin/index', context);  
                });
              });
            });

          });
        }
    });
});


//更新集合的价格

router.get('/index_package/update/package', function(req, res){

    var data_json = {
      'packageName' : req.query.packageName,
      'packagePrice' : req.query.packagePrice
    };

    PackageModel.find({packageName : req.query.packageName}, function(err, packages){
    if(packages.length === 0){
      return res.render('admin/index_package');
    }
    else{
      var _id = packages[0]._id;

      data_json = {
        'packageName' : req.query.packageName || packages[0].packageName,
        'packagePrice' : req.query.packagePrice || packages[0].packagePrice,
      };

      PackageModel.update({'packageName' : req.query.packageName}, data_json, {multi: true}, function(err, userpackages){
      });
    }

    return res.render('admin/index_package');

    });

});

//更新集合的排序
router.get('/index_package/update/packageOrder', function(req, res){

    var data_json = {
      'packageName' : req.query.packageName,
      'subPackageName' : req.query.subPackageName,
      'packageId' : req.query.packageId
    };

    PackageModel.find({packageName : req.query.packageName, SubPackageName: req.query.subPackageName}, function(err, packages){
    if(packages.length === 0){
      return res.render('admin/index_package');
    }
    else{
      var _id = packages[0]._id;

      data_json = {
        'packageId' : req.query.packageId || packages[0].packageId
      };

      PackageModel.update({'packageName' : req.query.packageName, 'SubPackageName': req.query.subPackageName}, data_json, function(err, userpackages){
      });
    }

    return res.render('admin/index_package');

    });

});


//搜索目前有哪些集合
router.get('/index_package/search/package', function(req, res){
    var search_key = req.query.searchKey;
    PackageModel.find({packageName : search_key}, function(err, packages){
      var context = {
        packages : packages.map(function(package){
          return{
            packageName : package.packageName,
            packagePrice : package.packagePrice,
            subPackageName : package.SubPackageName,
            packageId : package.packageId
          }
        })
      }
      return res.render('admin/index_package', context); 
    });
});


module.exports = router;
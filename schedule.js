var schedule = require('node-schedule');
var randomNumber = require('random-number');
var RankModel = require('./models/rank');

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

var j = schedule.scheduleJob('05 00 * * *', function(){
    var today_obj = new Date();
    var today_num = dateObjToDateNumber(today_obj);	
    var yesterday_num = today_num - 1;
	var todayArray = [];
	for( var m = 0; m < 200; m++){
	    var random_number_1 = randomNumber({
	      min : 1,
	      max : 92,
	      integer : true
	    });
	    var random_number_2 = randomNumber({
	      min : 93,
	      max : 302,
	      integer : true
	    });
	    todayArray.push(random_number_1);
	    todayArray.push(random_number_2);
	}
	RankModel.find({'date': today_num},function(err, rankList){
		if( rankList.length == 0 ){
			RankModel.find({'date': yesterday_num},function(err, rankListNew){
			  for( var k = 0; k < 50; k ++ ){
			    var random_number = randomNumber({
			      min : 200,
			      max : 12000,
			      integer : true
			    });  
			    totalArray.push(random_number);  
			  }
			  totalArray = totalArray.concat(rankListNew[0]['totalList']);
			  var data_json = {
			      'todayList' : todayArray,
			      'totalList' : totalArray,
			      'date' : today_num
			  };
			  var RankEntity = new RankModel(data_json);
			  RankEntity.save();
			});
		}
	});
});
//Import the mongoose module
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var opts = {
	server:{
		socketOptions: { keepAlive: 1 }
	}
};

DB_URL ='mongodb://peiwen:XiaoKa001@172.17.17.10:27017/admin';

//Set up default mongoose connection
// mongoose.connect(DB_URL, opts);
// Get Mongoose to use the global promise library

mongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    var db = db.db('memory'); // 选择一个db
    var col = db.collection('admin'); // 选择一个集合(表)
   // 插入数据
    col.insertOne(
        {
            username: "admin",
            password: "ka@ka2017Kfca39d"
        }, 
        //可选参数
        //{
        //    w: 'majority' // 开启 “大多数”模式，保证数据写入Secondary节点
        //}, 
        function(err, r) {
            console.info("err:", err);
            assert.equal(null, err);
            // 断言写入成功
            assert.equal(1, r.insertedCount);
            // 查询数据
            col.find().toArray(function(err, docs) {
                assert.equal(null, err);
                console.info("docs:", docs);
                db.close();
            });
        }
    );
});

mongoose.connection.on('connected', function(){
	console.log('Mongoose connection open to ' + DB_URL);
});

module.exports = mongoose;
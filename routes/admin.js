var express = require('express');
var AdminModel = require('../models/admin');
var router = express.Router();

var sess;

router.get('/login', function(req, res, next){

  sess = req.session;
  if(sess.authenticated){
    return res.redirect('/admin');
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
  /*
  if( req.body.username === "admin" && req.body.password === "ka@ka2017Kfca39d" )
  {
      sess.authenticated = true;
      return res.redirect('/admin/index');
  }
  */
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
      return res.render('admin/index')
   }
   else{
      return res.redirect('/admin/login');
   }

});

module.exports = router;
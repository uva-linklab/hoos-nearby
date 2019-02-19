var express = require('express');
var router = express.Router();

//get homepage
router.get('/', function(req, res){
	console.log("home");
	// res.render('index');
});

//scan
router.get('/scan', function(req, res){
	// res.render('scan');
	console.log("scan");
});

module.exports = router;
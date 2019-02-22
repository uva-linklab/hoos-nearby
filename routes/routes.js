var express = require('express');
var router = express.Router();
const Scanner = require('../scanner/scanner');

//get homepage
router.get('/', function(req, res){
	res.render('index.nunjucks');
});

var entries = {};

//scan
router.get('/scan', function(req, res){
	// res.render('scan');
	console.log("scan");

	let scanner = new Scanner();

	scanner.on("rangingkey", function(device_name, adv){
		console.log(`got ${device_name}, ${adv}`);
		entries[device_name] = adv;
	});

	scanner.on(null, function(){
		console.log("entries =");
		console.log(entries);
		const data = {"entries": entries};
		res.render('scannedDevices.nunjucks', data);
		entries = {};
	})

	scanner.initialize("url", 10000);

});

module.exports = router;
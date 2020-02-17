var express = require('express');
var router = express.Router();
const Scanner = require('../scanner/scanner');
const request = require('request-promise');
const { spawn } = require('child_process');
const path = require('path');

const Keyv = require('keyv');

const keyv = new Keyv('mongodb://localhost:27017/gateway_mappings');
// Handle DB connection errors
keyv.on('error', err => console.log('Connection Error', err));

//TODO check if this can be moved inside getScanResults
var discovered_gateways = {};

//get homepage
router.get('/', function(req, res){
	res.render('index.nunjucks');
});

//scan
router.get('/scan', getScanResults);

async function getScanResults(req, res) {
	// res.render('scan');
	console.log("scan");

	let scanner = new Scanner();

	scanner.on("rangingkey", function(device_name, adv){
		console.log(`got ${device_name}, ${adv}`);
		discovered_gateways[device_name] = adv;
	});

	scanner.on(null, handleScanComplete);
	scanner.initialize("url", 10000);

	//check if this can be moved outside of getScanResults
	async function handleScanComplete() {

		console.log("discovered gateways =");
		console.log(discovered_gateways);

		//clear storage to remove stale keys
		await keyv.clear();

		//get the link graph from one of the devices. Then create the entire list of devices and display that in a new UI page
		const all_gateways = {};

		//if there is at least one discovered gateway, then take the first ip as sample and then get the entire link graph from that
		var linkGraphUrl = "";
		if(Object.keys(discovered_gateways).length != 0) {
			const sample_ip = Object.entries(discovered_gateways)[0][1];
			const linkGraph = await getAppResponse(sample_ip, "linkGraph");
			linkGraphUrl = `http://${sample_ip}:5000/linkGraph`;

			for(const entry of Object.entries(linkGraph["data"])) {
				const mac_address = entry[0];
				const ip_address = entry[1]["ip"];
				all_gateways[mac_address] = ip_address;

				//keep the mac and ip address mappings for future requests
				await keyv.set(mac_address, ip_address);
			}
		}

		//on an OS X machine, you cannot get the MAC address from the advertisement, leaving us to use an id provided from noble. So discovered_gateways is a mapping from this noble id to IP address. From the linkgraph API, we get the MAC address to IP address mappings. This code puts the actual MAC address of the discovered_gateways in a new object.
		var discovered_gateways_fixed = {};
		Object.entries(discovered_gateways).forEach(function(entry) {
			const ip_address = entry[1];
			const mac_address = getMacAddress(ip_address, all_gateways);
			discovered_gateways_fixed[mac_address] = ip_address;
		});

		console.log("all gateways =");
		console.log(all_gateways);

		console.log("discovered_gateways_fixed =");
		console.log(discovered_gateways_fixed);

		const data = {
			"discovered_gateways": discovered_gateways_fixed, 
			"all_gateways": all_gateways,
			"linkGraphUrl": linkGraphUrl

		};
		res.render('scannedDevices.nunjucks', data);
		discovered_gateways = {};
	}
} 

async function getAppResponse(ip, appName) {
	const appId = await getAppId(ip, appName);
	const execUrl = `http://${ip}:5000/execute/${appId}`;
	const body = await request({method: 'GET', uri: execUrl})
	return JSON.parse(body);
}

function getAppId(ip, appName) {
	const appsUrl = `http://${ip}:5000/apps`;
	return request({method: 'GET', uri: appsUrl})
		.then(body => {
			return JSON.parse(body)
				.filter(app => app.app_name === appName)[0].app_id;
		});
}

router.get('/gateway/:mac_address', getGatewayDetails);

async function getGatewayDetails(req, res){

	const macAddress = req.params.mac_address;
	const ipAddress = await keyv.get(macAddress);
	console.log(`from keyv, ipAddress = ${ipAddress}`);

	//get the API for the apps of the gateway
	const apps = await getAllApps(ipAddress);

	//get all attached sensors
	const sensors = await getAppResponse(ipAddress, "sensorDiscovery");
	sensors.forEach(sensor => {
		const receiver = sensor["receiver"];
		sensor["receiver"] = receiver.split("-")[0];
	});

	//get all neighbors
	const neighbors = await getAppResponse(ipAddress, "partialLinkGraph");

	const data = {
					"mac_address": macAddress,
					"ip_address": ipAddress, 
					"apps": apps, 
					"sensors": sensors,
					"neighbors": neighbors
				};

	res.render("gatewayPage.nunjucks", data);
}

function getAllApps(ip) {
	const appsUrl = `http://${ip}:5000/apps`;
	return request({method: 'GET', uri: appsUrl})
		.then(body => {
			return JSON.parse(body);
		});
}

function getMacAddress(ip, all_gateways) {
	for(const entry of Object.entries(all_gateways)) {
		const mac_address = entry[0];
		const ip_address = entry[1];

		if(ip === ip_address) {
			return mac_address;
		}
	}
}

//**************************
router.get('/code-deploy', getCodeDeployPage);
async function getCodeDeployPage(req, res) {
	//TODO get this from req
	const sampleIP = "172.27.44.129";
	const linkGraph = await getAppResponse(sampleIP, "linkGraph");

	const linkGraphData = linkGraph["data"];
	const gateways = Object.keys(linkGraphData);
	console.log(gateways);
	const allSensorIds = gateways.map(gateway => {
		const sensors = linkGraphData[gateway]["sensors"];
		const sensorIds = sensors.map(sensorData => {
			return sensorData["_id"];
		})
		return sensorIds;
	});

	//TODO use better impl. flatMap and flat did not work on node older version
	// var sensors = [];
	// for(var sensorList of allSensorIds) {
	// 	console.log(sensorList);
	// 	sensors = sensors.concat(sensorList);
	// 	console.log(sensors);
	// }
	const sensorList = allSensorIds.reduce((acc,sensors) => acc.concat(sensors));
	console.log(sensorList);
	// const sensors = [
	// 	"5a28f0f77c0f",
	// 	"0575f0f77c0f",
	// 	"f745f0f77c0f",
	// 	"d075f0f77c0f",
	// 	"a145f0f77c0f",
	// 	"b175f0f77c0f",
	// 	"3d669891df8c",
	// 	"9c28f0f77c0f",
	// 	"8fc79891df8c",
	// 	"3b28f0f77c0f",
	// 	"1675f0f77c0f"
	// ];

	// console.log(sensors);
	const data = {
		"sensors": sensorList
	};

	res.render("codeDeployPage.nunjucks", data)
}

router.post('/deploy-action', performCodeDeployment);
function performCodeDeployment(req, res) {
	const deployerPath = path.join(__dirname, "../code-deployer/deployer");
	console.log(deployerPath);

	console.log(req.body);

	//TODO fix this
	// const codePath = req.body.codepath;
	const codePath = path.join(__dirname, "../code-deployer/test-code/test.js");
	const sensors = req.body.sensors;

	const sensorList = sensors.reduce((acc, sensor) => acc + "," + sensor);
	// console.log(sensorList);

	const codeProcess = spawn('node', [deployerPath, codePath, sensorList]);

	codeProcess.stdout.on('data', (data) => {
		console.log(data.toString().trim());
	});

	codeProcess.stderr.on('data', (data) => {
		console.error(data.toString());
	});

	codeProcess.on('exit', (data) => {
		console.log("script exited");
	});
	res.end();
}

module.exports = router;
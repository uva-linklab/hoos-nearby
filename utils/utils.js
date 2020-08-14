const request = require('request-promise');
const pcap = require('pcap');
const config = require('./config.json');
const httpFileTransfer = require("./http-file-transfer");
const crypto = require('crypto');

exports.getIPAddress = function() {
	const networkInterface = config.network.interface;
	if(!networkInterface) {
		console.log("interface not found in config file");
	}

	//regex to exclude ipv6 addresses and only capture ipv4 addresses. This doesn't ensure that the ipv4 octets are 0-255 but this would suffice. All we need is to exclude ipv6 addresses. 
	const regex = /^\d+\.\d+\.\d+\.\d+$/;
	return pcap.findalldevs()
				.find(elem => elem.name === networkInterface)
				.addresses
				.find(addrElem => addrElem && regex.test(addrElem.addr))
				.addr;
};

exports.getLinkGraphVisualUrl = function(gatewayIP) {
	return `http://${gatewayIP}:5000/platform/link-graph-visual`;
};

/**
 * Use the platform API to get the link graph data
 * @returns {Promise<json>} promise of the link graph json
 */
exports.getLinkGraphData = async function(gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/platform/link-graph-data`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
};

/**
 * Uses the gateway API to query for the devices connected to a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>}
 */
exports.getDeviceData = async function (gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/devices`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
};

/**
 * Uses the gateway API to query for the apps running on a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>}
 */
exports.getAppsData = async function (gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/apps`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
};

/**
 * Uses the gateway API to query for the neighbors of a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>} promise of a list of list of gateway_name and gateway_IP
 */
exports.getNeighborData = async function(gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/neighbors`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
};

/**
 * Calls the execute-app API to run an app on a specified gateway
 * @param gatewayIP The ip of the gateway where the app needs to run
 * @param appFiles Object with key-value pairs app and metadata paths
 * @param successCallback
 * @param failureCallback
 */
exports.executeAppOnGateway = function(gatewayIP, appFiles, successCallback, failureCallback) {
	const httpFileTransferUri = `http://${gatewayIP}:5000/gateway/execute-app`;
	httpFileTransfer.transferFiles(httpFileTransferUri,
		appFiles,
		successCallback,
		failureCallback
	);
};

/**
 * Given a utf-8 string, encodes it to base64 and returns it
 * @param str
 * @returns {string}
 */
exports.encodeToBase64 = function(str) {
	const buffer = Buffer.from(str, 'utf-8');
	return buffer.toString('base64');
};

/**
 * Given a base64 encoded string, returns its utf-8 string
 * @param encodedStr
 * @returns {string}
 */
exports.decodeFromBase64 = function(encodedStr) {
	const buffer = Buffer.from(encodedStr, 'base64');
	return buffer.toString('utf-8');
};

const algorithm = 'aes-256-ctr';

exports.encryptAES = function(text, password, iv) {
	const cipher = crypto.createCipheriv(algorithm, password, iv);
	let encrypted = cipher.update(text, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	return encrypted;
};

exports.decryptAES = function(encrypted, password, iv) {
	const decipher = crypto.createDecipheriv(algorithm, password, iv);
	let dec = decipher.update(encrypted, 'base64', 'utf8');
	dec += decipher.final('utf8');
	return dec;
};
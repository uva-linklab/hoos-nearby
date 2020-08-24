const request = require('request-promise');
const config = require('./config.json');
const httpFileTransfer = require("./http-file-transfer");
const crypto = require('crypto');
const Address4 = require('ip-address').Address4;

function getConfig(key) {
	const value = config[key];
	if(!value) {
		throw new Error(`${key} not defined in utils/config.json`);
	}
	return value;
}

/**
 * Returns a gateway's id and ip address from its encrypted advertisement name
 * @param advertisementName the encrypted local name field obtained from the BLE advertisement
 * @return {{ip: string, id: string}}
 */
function getGatewayDetails(advertisementName) {
	const groupKey = getConfig('groupKey');

	const decryptedStr = decryptAES(advertisementName, groupKey.key, groupKey.iv);
	const parts = decryptedStr.split('*');

	return {
		id: parts[0],
		ip: Address4.fromHex(parts[1]).address
	};
}

const algorithm = 'aes-256-ctr';
function decryptAES(encrypted, password, iv) {
	const decipher = crypto.createDecipheriv(algorithm, password, iv);
	let dec = decipher.update(encrypted, 'base64', 'utf8');
	dec += decipher.final('utf8');
	return dec;
}

function getLinkGraphVisualUrl(gatewayIP) {
	return `http://${gatewayIP}:5000/platform/link-graph-visual`;
}

/**
 * Use the platform API to get the link graph data
 * @returns {Promise<json>} promise of the link graph json
 */
async function getLinkGraphData(gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/platform/link-graph-data`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
}

/**
 * Uses the gateway API to query for the devices connected to a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>}
 */
async function getDeviceData(gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/devices`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
}

/**
 * Uses the gateway API to query for the apps running on a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>}
 */
async function getAppsData(gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/apps`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
}

/**
 * Uses the gateway API to query for the neighbors of a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>} promise of a list of list of gateway_name and gateway_IP
 */
async function getNeighborData(gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/neighbors`;
	const body = await request({method: 'GET', uri: execUrl});
	return JSON.parse(body);
}

/**
 * Calls the execute-app API to run an app on a specified gateway
 * @param gatewayIP The ip of the gateway where the app needs to run
 * @param appFiles Object with key-value pairs app and metadata paths
 * @param successCallback
 * @param failureCallback
 */
function executeAppOnGateway(gatewayIP, appFiles, successCallback, failureCallback) {
	const httpFileTransferUri = `http://${gatewayIP}:5000/gateway/execute-app`;
	httpFileTransfer.transferFiles(httpFileTransferUri,
		appFiles,
		successCallback,
		failureCallback
	);
}

/**
 * Given a utf-8 string, encodes it to base64 and returns it
 * @param str
 * @returns {string}
 */
function encodeToBase64(str) {
	const buffer = Buffer.from(str, 'utf-8');
	return buffer.toString('base64');
}

/**
 * Given a base64 encoded string, returns its utf-8 string
 * @param encodedStr
 * @returns {string}
 */
function decodeFromBase64(encodedStr) {
	const buffer = Buffer.from(encodedStr, 'base64');
	return buffer.toString('utf-8');
}

module.exports = {
	getGatewayDetails: getGatewayDetails,
	getLinkGraphVisualUrl: getLinkGraphVisualUrl,
	getLinkGraphData: getLinkGraphData,
	getDeviceData: getDeviceData,
	getAppsData: getAppsData,
	getNeighborData: getNeighborData,
	executeAppOnGateway: executeAppOnGateway,
	encodeToBase64: encodeToBase64,
	decodeFromBase64: decodeFromBase64
};
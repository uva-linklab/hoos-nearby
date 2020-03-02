const request = require('request-promise');
const pcap = require('pcap');
const config = require('./config.json');

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
 * Uses the gateway API to query for the sensors connected to a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<json>}
 */
exports.getSensorData = async function (gatewayIP) {
	const execUrl = `http://${gatewayIP}:5000/gateway/sensors`;
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
const EventEmitter = require('events');
const mqtt = require("mqtt");
const request = require('request-promise');
const utils = require('../../utils');

class NetworkInteractionManager extends EventEmitter {
	constructor() {
		super();
		this.mqttTopic = "platform-data";
		this.httpApiServerPort = 5000;
		this._subscribeToMQTT();
	}

	disseminateAll(tag, data) {
		const metadata = {
			"origin-address": utils.getIPAddress(),
			"api": "disseminate-all",
			"tag": tag
		};
		const fullData = {"_meta": metadata, "data": data};
		this._sendPostRequest(`http://localhost:${this.httpApiServerPort}/platform/disseminate-all`, fullData);
	}

	queryAll(tag, replyTag, data) {
		const metadata = {
			"origin-address": utils.getIPAddress(),
			"api": "query-all",
			"tag": tag,
			"reply-tag": replyTag
		};
		const fullData = {"_meta": metadata, "data": data};
		this._sendPostRequest(`http://localhost:${this.httpApiServerPort}/platform/query-all`, fullData);
	}

	_sendPostRequest(url, data) {
		var options = {
		    method: 'POST',
		    uri: url,
		    body: data,
		    json: true // Automatically stringifies the body to JSON
		};
		request(options);
	}

	_subscribeToMQTT() {
		const mqttClient = mqtt.connect("mqtt://localhost");
		mqttClient.on('connect', () => {
			console.log("YTBN service connected to mqtt");
	  		mqttClient.subscribe(this.mqttTopic);
	  	});
		mqttClient.on('message', (topic, message) => {
			if(topic === this.mqttTopic) {
				const data = JSON.parse(message.toString());
				const api = data._meta.api;
				const tag = data._meta.tag;
				this.emit(api, tag, data);
		  	}
		});
	}
}

module.exports = NetworkInteractionManager;
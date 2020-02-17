"use strict";
// var events = require('events');
const EventEmitter = require( 'events' );
var util = require('util');
var request = require("request");
var fs = require('fs');
var noble = require("noble-mac");
const utils = require("./utils/utils");
const path = require('path');
const aes_crypto = require("./aes-crypto");

const params_file = "params.json";

var nobleInitialized = false;

var self;
class Scanner extends EventEmitter {
	initialize(url, timeout) {
		console.log(__dirname);
		console.log(noble._state);

		this.register_url = url;
		this.ranging_key = "";
		this.iv = "";
		this.black_list = [];
		this.register_url = "";
		self = this;
		this.loadKeyParams(this.handleKeyParams);

		setTimeout(function (){
			console.log("reached 3 seconds");
			noble.stopScanning();
			self.emit(null);

		}, timeout);
	}

	loadKeyParams(callback) {
		const filePath = path.join(__dirname, params_file);
		console.log(filePath);
		if (!fs.existsSync(filePath)) {
			console.log("file doesn't exist");

			callback("")
		} else {
			fs.readFile(filePath, 'utf-8', function handleReadFile(err, data) {
				if (err) 
					throw err;
				const key_params = JSON.parse(data);
				callback(key_params);
			});
		}
	}

	handleKeyParams(key_params){
		if(!key_params) {
			mac_address = bleno.address;
			this.registerWithServer(mac_address, "admin", "pass");
		} else {
			self.ranging_key = key_params.ranging_key;
			self.iv = key_params.iv;
			utils.logWithTs(`[Ranging] Reusing already obtained key = ${key_params.ranging_key}, IV = ${key_params.iv}`);
		    //look for peripherals once we have the key
		    self.initializeNoble();
		    // console.log(`ranging_key = ${ranging_key}`);
		    // console.log(self.iv);
		    // self.emit("rangingkey");
		}
	}

	registerWithServer(mac_address, user, pass) {
		var http_post_req_params = {
			"headers": { "content-type": "application/json" },
			"url": register_url,
			"body": JSON.stringify({
				"radioMACAddress": mac_address,
				"user": user,
				"pass": pass
			})
		};
		request.post(http_post_req_params, handlePOSTResponse);
	}

	handlePOSTResponse(error, response, body) {
		if(error) {
			return console.dir(error);
		}
		var key_params = JSON.parse(body);
		self.ranging_key = key_params.ranging_key;
		self.iv = key_params.iv;
		utils.logWithTs(`[Ranging] Received ranging key from registration server. Key = ${ranging_key}, IV = ${iv}`);
		fs.writeFile(params_file,  JSON.stringify(key_params), 'utf-8', handleWriteFileError);
	  //look for peripherals once we have the key
	  self.initializeNoble();
	  // console.log(`ranging_key = ${ranging_key}`);
	  // this.emitter.emit("rangingkey");
	  // console.log(self.iv);
	}

	handleWriteFileError(err) {
		if (err) throw err;
	}

	initializeNoble() {
	  if(!nobleInitialized) {
	  	noble.on('stateChange', self.handleNobleStateChange);
	  	noble.on('discover', self.handleDiscoveredPeripheral);
	  	nobleInitialized = true;
	  } else {
	  	noble.startScanning();
	    utils.logWithTs("[BLE Radio] Started peripheral discovery");
	  }
	}

	handleNobleStateChange(state) {
	  if (state === 'poweredOn') {
	    noble.startScanning();
	    utils.logWithTs("[BLE Radio] Started peripheral discovery");
	  } else {
	    noble.stopScanning();
	  }
	}

	handleDiscoveredPeripheral(peripheral) {
	  // console.log("[BLE Radio] Peripheral discovered: " + peripheral.id);
	  

	  if(self.black_list.includes(peripheral.id)) {
	    return;
	  }

	  if (!peripheral.advertisement.manufacturerData) {
	    // console.log("[BLE Radio] Peripheral discovered: " + peripheral.id);
	    
	    const localName = peripheral.advertisement.localName;
	    if(typeof localName === "undefined") {
	      // utils.logWithTs(`[BLE Radio] blacklisted ${peripheral.id}`);
	      self.black_list.push(peripheral.id);
	    } else {
	      var data = localName.toString('utf8');
	      console.log(`[BLE Radio] Received advertisement data = ${data}`);
	      var discovered_ip = aes_crypto.decrypt(data, self.ranging_key, self.iv);
	      // console.log("[Ranging] Decrypted data = " + discovered_ip);
	      if(self.isValidIPAddress(discovered_ip)) {
	        utils.logWithTs("[BLE Radio] Peripheral discovered: " + peripheral.id);
	        utils.logWithTs(`[Ranging] IP Address = ${discovered_ip}`);

	        self.emit("rangingkey", peripheral.id, discovered_ip);
	        // addToPartialLinkGraphDB(peripheral.address, discovered_ip);
	      } else {
	        utils.logWithTs(`[BLE Radio] blacklisted ${peripheral.id}`);
	        self.black_list.push(peripheral.id);
	      }
	    }
	  }
	}

	isValidIPAddress(ipaddress) {  
	  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
	    return (true);  
	  }  
	  return (false);  
	}
};

module.exports = Scanner;
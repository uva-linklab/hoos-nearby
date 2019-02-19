var Request = require("request");
var noble = require("noble-mac");
var fs = require('fs');
var aes_crypto = require("./aes_crypto");
const utils = require("./utils/utils");

register_url = process.argv[2];

params_file = "params.json";
ranging_key = "";
iv = "";

var black_list = [];

if(!register_url){
  console.log("Please provide register url");
  process.exit(1);
}

loadKeyParams(handleKeyParams);

function initializeNoble() {
  noble.on('stateChange', handleNobleStateChange);
  noble.on('discover', handleDiscoveredPeripheral);  
}

function handleNobleStateChange(state) {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
    utils.logWithTs("[BLE Radio] Started peripheral discovery");
  } else {
    noble.stopScanning();
  }
}

function handleDiscoveredPeripheral(peripheral) {
  // console.log("[BLE Radio] Peripheral discovered: " + peripheral.id);

  if(black_list.includes(peripheral.id)) {
    return;
  }

  if (!peripheral.advertisement.manufacturerData) {
    // console.log("[BLE Radio] Peripheral discovered: " + peripheral.id);
    
    const localName = peripheral.advertisement.localName;
    if(typeof localName === "undefined") {
      // utils.logWithTs(`[BLE Radio] blacklisted ${peripheral.id}`);
      black_list.push(peripheral.id);
    } else {
      var data = localName.toString('utf8');
      console.log(`[BLE Radio] Received advertisement data = ${data}`);
      var discovered_ip = aes_crypto.decrypt(data, ranging_key, iv);
      // console.log("[Ranging] Decrypted data = " + discovered_ip);
      if(isValidIPAddress(discovered_ip)) {
        utils.logWithTs("[BLE Radio] Peripheral discovered: " + peripheral.id);
        utils.logWithTs(`[Ranging] IP Address = ${discovered_ip}`);
        // addToPartialLinkGraphDB(peripheral.address, discovered_ip);
      } else {
        utils.logWithTs(`[BLE Radio] blacklisted ${peripheral.id}`);
        black_list.push(peripheral.id);
      }
    }
  }
}

function isValidIPAddress(ipaddress) {  
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
    return (true);  
  }  
  return (false);  
}

function loadKeyParams(callback) {
  if (!fs.existsSync(params_file)) {
    callback("")
  } else {
    fs.readFile(params_file, 'utf-8', function handleReadFile(err, data) {
      if (err) 
        throw err;
      key_params = JSON.parse(data);
      callback(key_params);
    });
  }
}

function registerWithServer(mac_address, user, pass) {
  var http_post_req_params = {
      "headers": { "content-type": "application/json" },
      "url": register_url,
      "body": JSON.stringify({
          "radioMACAddress": mac_address,
          "user": user,
          "pass": pass
      })
  };
  Request.post(http_post_req_params, handlePOSTResponse);
}

function handlePOSTResponse(error, response, body) {
  if(error) {
      return console.dir(error);
  }
  var key_params = JSON.parse(body);
  ranging_key = key_params.ranging_key;
  iv = key_params.iv;
  utils.logWithTs(`[Ranging] Received ranging key from registration server. Key = ${ranging_key}, IV = ${iv}`);
  fs.writeFile(params_file,  JSON.stringify(key_params), 'utf-8', handleWriteFileError);
  //look for peripherals once we have the key
  initializeNoble();
}

function handleWriteFileError(err) {
  if (err) throw err;
}  

function handleKeyParams(key_params){
  if(!key_params) {
    mac_address = bleno.address;
    registerWithServer(mac_address, "admin", "pass");
  } else {
    ranging_key = key_params.ranging_key;
    iv = key_params.iv;
    utils.logWithTs(`[Ranging] Reusing already obtained key = ${key_params.ranging_key}, IV = ${key_params.iv}`);
    //look for peripherals once we have the key
    initializeNoble();
  }
}
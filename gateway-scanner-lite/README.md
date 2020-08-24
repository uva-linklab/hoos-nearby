# Gateway Scanner Lite
This module is a trimmed down version of the gateway-scanner in the gateway repository. It allows auxiliary devices to 
scan for gateways that are nearby using the group key of the network. The group key is specified in utils/config.json.

* There are a few differences from the module in the gateway repo:
    1. Uses the noble module for scanning BLE advertisements. Doesn't use bleno for advertising itself.
    2. Performs the gateway scan for a specified amount of time and emits events whenever a new peripheral is 
    discovered.  
    3. Uses abandonware/noble-mac, a fork of noble, since noble does not work for recent OSX versions.
    
##Example
```js
const GatewayScanner = require('./gateway-scanner-lite');
const gatewayScanner = GatewayScanner.getInstance();
gatewayScanner.startScanning(5000); // scan for 5 seconds

gatewayScanner.on("peripheral-discovered", function (gatewayId, gatewayIp) {
  console.log(`Discovered ${gatewayId}, ${gatewayIp}`);
});

gatewayScanner.on("scan-complete", function () {
  console.log("scan complete");
});
```
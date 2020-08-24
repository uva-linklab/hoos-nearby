const EventEmitter = require('events');
const noble = require('@abandonware/noble');
const utils = require("../utils/utils");

const gatewayUuid = '18338db15c5841cca00971c5fd792920';

let instance = null;

class GatewayScannerLite extends EventEmitter {
    constructor() {
        super();
        this._initialized = false;
        this.discoveredDevices = [];
    }

    static getInstance() {
        if(!instance) {
            instance = new GatewayScannerLite();
        }
        return instance;
    }

    _initializeNoble() {
        return new Promise(resolve => {
            if(this._initialized) {
                resolve();
            } else {
                noble.on('stateChange', state => {
                    if(state === 'poweredOn') {
                        console.log('[ble-scanner] BLE powered on. Noble initialized.');
                        this._initialized = true;
                        resolve();
                    } else if(state === 'poweredOff') {
                        console.log('[ble-scanner] BLE appears to be disabled.');
                        noble.stopScanning();
                    } else if(state === 'scanStop') {
                        console.log('[ble-scanner] BLE scan stopped.');
                    } else if(state === 'scanStart') {
                        console.log('[ble-scanner] BLE scan started.');
                    }
                });
            }
        });
    }

    startScanning(timeoutMillis) {
        this._initializeNoble().then(() => {
            this.discoveredDevices = []; // clear devices

            noble.startScanning([gatewayUuid], true);

            //stop noble scanning, notify listeners, and exit after timeoutMillis
            //note: arrow functions can also access the parent's context ("this")
            setTimeout(() => {
                noble.stopScanning();
                this.emit("scan-complete");
                this.removeAllListeners(); // make sure that you remove all EventEmitter listeners
            }, timeoutMillis);

            noble.on('discover', peripheral => {
                const localName = peripheral.advertisement.localName;
                if(localName) {
                    if(!this.discoveredDevices.includes(localName)) {
                        const gatewayDetails = utils.getGatewayDetails(localName.toString('utf8'));
                        this.emit("peripheral-discovered", gatewayDetails.id, gatewayDetails.ip);
                        this.discoveredDevices.push(localName);
                    }
                }
            });
        })
    }
}

module.exports = GatewayScannerLite;

const EventEmitter = require('events');
const fs = require('fs-extra');
const noble = require('@abandonware/noble');
const utils = require("../utils/utils");
const path = require('path');

const paramsFileName = "group-key.json";
const paramsFilePath = path.join(__dirname, paramsFileName);

const gatewayUuid = '18338db15c5841cca00971c5fd792920';

let instance = null;

class GatewayScannerLite extends EventEmitter {
    constructor() {
        super();
        this._initialized = false;
        this.discoveredDevices = [];
        this.groupKey = this._getGroupKeyParams();
        if (!this.groupKey) {
            console.log(`Group key params not found in ${paramsFilePath}. Please refer to setup instructions in the readme file.`);
            process.exit(1);
        }
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
                        this.stopScanning();
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
                        const discoveredIp = utils.decryptAES(localName.toString('utf8'), this.groupKey.key, this.groupKey.iv);
                        this.emit("peripheral-discovered", peripheral.id, discoveredIp);
                        this.discoveredDevices.push(localName);
                    }
                }
            });
        })
    }

    _getGroupKeyParams() {
        if (!fs.existsSync(paramsFilePath)) {
            return "";
        } else {
            const keyParams = fs.readFileSync(paramsFilePath, 'utf-8');
            return JSON.parse(keyParams);
        }
    }
}

module.exports = GatewayScannerLite;

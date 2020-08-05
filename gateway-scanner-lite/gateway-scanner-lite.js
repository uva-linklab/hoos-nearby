const EventEmitter = require('events');
const fs = require('fs-extra');
const noble = require('@abandonware/noble');
const utils = require("../utils/utils");
const path = require('path');

const paramsFileName = "group-key.json";
const paramsFilePath = path.join(__dirname, paramsFileName);

const gatewayUuid = '18338db15c5841cca00971c5fd792920';

class GatewayScannerLite extends EventEmitter {
    /**
     * Initialize the gateway scanner
     * @param timeoutMillis Time in milliseconds for which the noble scan needs to be done
     */
    constructor(timeoutMillis) {
        super();

        this.timeoutMillis = timeoutMillis;
        this.groupKey = this._getGroupKeyParams();
        this.discoveredDevices = [];
        if (!this.groupKey) {
            console.log(`Group key params not found in ${paramsFilePath}. Please refer to setup instructions in the readme file.`);
            process.exit(1);
        }
        this._initializeNoble();
    }

    _getGroupKeyParams() {
        if (!fs.existsSync(paramsFilePath)) {
            return "";
        } else {
            const keyParams = fs.readFileSync(paramsFilePath, 'utf-8');
            return JSON.parse(keyParams);
        }
    }

    _initializeNoble() {
            /*
            Use _handleNobleStateChange and _handleDiscoveredPeripheral as the callback functions
            Within the callback functions, we intend to use the parent's class fields and thus need to use the
            "this" operator.
            However, JS functions in a class used as callback functions does not have the context of the parent.
            One solution is to "bind" the context of such functions explicitly to the parent's context.
            Source: https://stackoverflow.com/a/20279485/445964
            */
            noble.on('stateChange', this._handleNobleStateChange.bind(this));
            noble.on('discover', this._handleDiscoveredPeripheral.bind(this));
    }

    _handleNobleStateChange(state) {
        if (state === 'poweredOn') {
            noble.startScanning([gatewayUuid], true);

            //stop noble scanning, notify listeners, and exit after timeoutMillis
            //note: arrow functions can also access the parent's context ("this")
            setTimeout(() => {
                noble.stopScanning();
                this.emit("scan-complete");
            }, this.timeoutMillis);
        } else if(state === 'poweredOff') {
            console.log("Bluetooth appears to be disabled.");
            noble.stopScanning();
        }
    }

    _handleDiscoveredPeripheral(peripheral) {
        const localName = peripheral.advertisement.localName;
        if(localName) {
            if(!this.discoveredDevices.includes(localName)) {
                const discoveredIp = utils.decryptAES(localName.toString('utf8'), this.groupKey.key, this.groupKey.iv);
                this.emit("peripheral-discovered", peripheral.id, discoveredIp);
            }
        }
    }
}

module.exports = GatewayScannerLite;

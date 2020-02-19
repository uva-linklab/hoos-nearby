const EventEmitter = require('events');
const fs = require('fs');
const noble = require('@abandonware/noble');
const aesCrypto = require("./aes-crypto");

const paramsFileName = "group-key.json";
const paramsFilePath = __dirname + "/" + paramsFileName;

class GatewayScannerLite extends EventEmitter {
    /**
     * Initialize the gateway scanner
     * @param timeoutMillis Time in milliseconds for which the noble scan needs to be done
     */
    constructor(timeoutMillis) {
        super();

        this.timeoutMillis = timeoutMillis;
        this.blackList = [];
        this.groupKey = this._getGroupKeyParams();
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
            noble.startScanning();

            //stop noble scanning, notify listeners, and exit after timeoutMillis
            //note: arrow functions can also access the parent's context ("this")
            setTimeout(() => {
                noble.stopScanning();
                this.emit("scan-complete");
                process.exit(0);
            }, this.timeoutMillis);
        } else {
            noble.stopScanning();
        }
    }

    _handleDiscoveredPeripheral(peripheral) {
        if (this.blackList.includes(peripheral.id)) {
            return;
        }

        if (!peripheral.advertisement.manufacturerData) {
            const localName = peripheral.advertisement.localName;
            if (typeof localName === "undefined") {
                //blacklist the peripherals with undefined localName field
                this.blackList.push(peripheral.id);
            } else {
                var data = localName.toString('utf8');
                var discoveredIp = aesCrypto.decrypt(data, this.groupKey.key, this.groupKey.iv);
                if (this._isValidIPAddress(discoveredIp)) {
                    this.emit("peripheral-discovered", peripheral.id, discoveredIp);
                } else {
                    this.blackList.push(peripheral.id);
                }
            }
        }
    }

    _isValidIPAddress(ipaddress) {
        return (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
            .test(ipaddress))
    }
}

module.exports = GatewayScannerLite;

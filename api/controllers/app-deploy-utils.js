const fs = require('fs-extra');
const utils = require('../../utils/utils');
const path = require('path');

class Gateway {
    constructor(ip, memoryFreeMB, cpuFreePercent, numDevicesSupported) {
        this.ip = ip;
        this.memoryFreeMB = memoryFreeMB;
        this.cpuFreePercent = cpuFreePercent;
        this.numDevicesSupported = numDevicesSupported;
    }

    toString() {
        return `Gateway @ ${this.ip}, [MemFreeMB: ${this.memoryFreeMB}, CPUFreePercent: ${this.cpuFreePercent},
            numDevicesSupported: ${this.numDevicesSupported}]`;
    }
}

// Specifies the threshold free CPU % and available memory on the gateways to execute an application
const CPU_FREE_PERCENT_THRESHOLD = 0.05; // 5% free CPU
const MEM_FREE_MB_THRESHOLD = 200; // 200MB of available memory

/**
 * Returns the best gateway to execute an application among two specified gateways.
 * The gateway is picked based on the number of supported devices, memory usage, and cpu usage (in that order).
 * @param gateway1 @type Gateway
 * @param gateway2 @type Gateway
 * @return {Gateway}
 */
function compareGateways(gateway1, gateway2) {
    if(gateway1.numDevicesSupported === gateway2.numDevicesSupported) {
        if(gateway1.memoryFreeMB === gateway2.memoryFreeMB) {
            return gateway1.cpuFreePercent >= gateway2.cpuFreePercent ? gateway1 : gateway2;
        } else {
            return gateway1.memoryFreeMB > gateway2.memoryFreeMB ? gateway1 : gateway2;
        }
    } else {
        return gateway1.numDevicesSupported > gateway2.numDevicesSupported ? gateway1 : gateway2;
    }
}

/**
 * Given a list of devices and the current link graph of the network, finds out which gateways host those devices.
 * Returns a dictionary of gateway->[sensor-ids]
 * @param devicesIds List of sensor ids
 * @param linkGraph Current link graph of the network
 * @returns {Promise<{}>} Promise object of the gateway->[sensor-id] mapping
 */
async function getHostGateways(devicesIds, linkGraph) {
    const gatewayToSensorMapping = {};
    const data = linkGraph["data"];

    for (const [gatewayId, gatewayData] of Object.entries(data)) {
        const gatewayDeviceList = gatewayData["devices"];
        const gatewayIp = gatewayData["ip"];

        //for each device given to us, find out if that is present in the device list of the current gw
        for (let i = 0; i < devicesIds.length; i++) {
            const targetDeviceId = devicesIds[i];
            const matchFound = gatewayDeviceList.find(function (device) {
                return device["id"] === targetDeviceId;
            });
            //there's a match
            if (matchFound) {
                if (gatewayIp in gatewayToSensorMapping) {
                    gatewayToSensorMapping[gatewayIp].push(targetDeviceId);
                } else {
                    gatewayToSensorMapping[gatewayIp] = [targetDeviceId];
                }
            }
        }
    }
    return gatewayToSensorMapping;
}

function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        console.error(err);
    }
}

/** Sends the app package to the Nexus Edge gateway platform.
 * @param appPath Path to the app
 * @param devices List of device ids
 * @param gatewayIp IP address of a gateway.
 * @param callback Indicates whether the app deployment was successful or not using a boolean argument
 */
exports.deployApp = async function(appPath, devices, gatewayIp, callback) {
    // Generate the deployment metadata.
    const metadata = {
        devices: {
            ids: devices,
            types: []
        }
    };
    const metadataPath = path.join(__dirname, 'deployMetadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    const paths = {
        deployMetadata: metadataPath,
        appPackage: appPath
    };

    utils.sendApplication(gatewayIp, paths)
        .then(() => callback(true, ''))
        .catch(() => callback(false, `App deployment attempt on failed. Please try again.`))
            .finally(() => {
                deleteFile(appPath);
                deleteFile(metadataPath);
            });
}

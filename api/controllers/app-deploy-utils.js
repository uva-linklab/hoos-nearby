const fs = require('fs-extra');
const utils = require("../../utils/utils");

/**
 * Given a list of sensors and the current link graph of the network, finds out which gateways host those sensors.
 * Returns a dictionary of gateway->[sensor-ids]
 * @param sensorIds List of sensor ids
 * @param linkGraph Current link graph of the network
 * @returns {Promise<{}>} Promise object of the gateway->[sensor-id] mapping
 */
async function getHostGateways(sensorIds, linkGraph) {
    const gatewayToSensorMapping = {};
    const data = linkGraph["data"];

    for (const [gatewayId, gatewayData] of Object.entries(data)) {
        const gatewaySensorList = gatewayData["sensors"];
        const gatewayIP = gatewayData["ip"];

        //for each sensor given to us, find out if that is present in the sensor list of the current gw
        for (var i = 0; i < sensorIds.length; i++) {
            const targetSensorId = sensorIds[i];
            const matchFound = gatewaySensorList.find(function (sensor) {
                return sensor["_id"] === targetSensorId;
            });
            //there's a match
            if (matchFound) {
                if (gatewayIP in gatewayToSensorMapping) {
                    gatewayToSensorMapping[gatewayIP].push(targetSensorId);
                } else {
                    gatewayToSensorMapping[gatewayIP] = [targetSensorId];
                }
            }
        }
    }
    return gatewayToSensorMapping;
}

/**
 * Given a mapping of type gateway->[sensor-id], return the IP of the gateway with the most number of sensors.
 * @param gatewaySensorsMapping
 * @returns {string}
 */
function getIdealGateway(gatewaySensorsMapping) {
    return Object.keys(gatewaySensorsMapping)
        .reduce(function (gatewayI, gatewayJ) {
            return (gatewaySensorsMapping[gatewayI].length >= gatewaySensorsMapping[gatewayJ].length) ? gatewayI : gatewayJ;
        });
}

function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        console.error(err);
    }
}

/**
 * Given an app, the sensor ids that the app uses, and the current link graph of the network, this function generates
 * a metadata file containing the gateways that house the sensors, then identifies the best gateway to run the app, and
 * uses the Gateway API on that gateway to execute the app.
 * @param appPath Path to the app
 * @param sensors List of sensor ids
 * @param linkGraph
 * @param appDeploymentCallback Indicates whether the app deployment was successful or not using a boolean argument
 */
exports.deployApp = function(appPath, sensors, linkGraph, appDeploymentCallback) {
    getHostGateways(sensors, linkGraph).then(mapping => {
        console.log(mapping);
        const targetGatewayIP = getIdealGateway(mapping);
        console.log(`Target gateway = ${targetGatewayIP}`);

        //store the metadata to a file
        const metadata = {"sensorMapping": mapping};
        console.log(metadata);
        const metadataPath = __dirname + '/metadata.json';
        fs.writeFileSync(metadataPath, JSON.stringify(metadata));

        //deploy the code using the Gateway API on the target gateway
        const appFiles = {
            app: appPath,
            metadata: metadataPath
        };

        utils.executeAppOnGateway(targetGatewayIP, appFiles, function() {
                console.log('App deployed on gateway network!');
                appDeploymentCallback(true);
                deleteFile(appPath);
                deleteFile(metadataPath);
            },
            function() {
                console.log('App deployment failed!');
                appDeploymentCallback(false);
                deleteFile(appPath);
                deleteFile(metadataPath);
            })
    });
};
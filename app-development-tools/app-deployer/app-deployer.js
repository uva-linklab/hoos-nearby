const request = require('request-promise');
const fs = require('fs');
const httpFileTransfer = require('./http-file-transfer');

/**
 * Given a list of sensors, finds out which gateways host those sensors. Returns a dictionary of gateway->[sensor-ids]
 * @param sensorIds List of sensor ids
 * @returns {Promise<{}>} Promise object of the gateway->[sensor-id] mapping
 */
async function getHostGateways(sensorIds) {
    const gatewayToSensorMapping = {};
    const linkGraph = await getLinkGraphData();
    const data = linkGraph["data"];

    for(const [gatewayId, gatewayData] of Object.entries(data)) {
		const gatewaySensorList = gatewayData["sensors"];
		const gatewayIP = gatewayData["ip"];

		//for each sensor given to us, find out if that is present in the sensor list of the current gw
		for (var i = 0; i < sensorIds.length; i++) {
			const targetSensorId = sensorIds[i];
			var matchFound = gatewaySensorList.find(function (sensor) {
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

/**
 * Use the platform API to get the link graph data
 * @returns {Promise<any>} promise of the link graph json
 */
async function getLinkGraphData() {
	//TODO change
    const execUrl = `http://172.27.44.129:5000/platform/link-graph-data`;
    const body = await request({method: 'GET', uri: execUrl});
    return JSON.parse(body);
}

function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        console.error(err);
    }
}

//**********************************
// main program starts here
//**********************************
scriptPath = process.argv[2];
sensorIdsStr = process.argv[3];

if (!scriptPath || !sensorIdsStr) {
    console.log("incorrect usage\nusage: node deployer <path-to-script> <comma-separated-sensor-ids>");
    process.exit(1);
}

//split into an array of sensor ids
sensorIds = sensorIdsStr.split(",");
getHostGateways(sensorIds).then(mapping => {
    console.log(mapping);
    const targetGatewayIP = getIdealGateway(mapping);
	console.log(`Target gateway = ${targetGatewayIP}`);

    //store the metadata to a file
    const metadata = {"sensorMapping": mapping};
    console.log(metadata);
    const metadataPath = __dirname + '/metadata.json';
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    //deploy the code using the Gateway API on the target gateway
    const files = {
        app: scriptPath,
        metadata: metadataPath
    };

    const httpFileTransferUri = `http://${targetGatewayIP}:5000/gateway/execute-app`;

    httpFileTransfer.transferFiles(httpFileTransferUri,
        files,
        function (body) {
            console.log('Upload successful!  Server responded with:', body);
            deleteFile(metadataPath);
        },
        function (err) {
            deleteFile(metadataPath);
            return console.error('upload failed:', err);
        }
    );
});

const request = require('request-promise');
const GatewayScanner = require('../../../gateway-scanner-lite');

/**
 * Given an ascii string, encodes it to base64 and returns a base64 string
 * @param str
 * @returns {string}
 */
function encodeToBase64(str) {
    const buffer = new Buffer(str);
    return buffer.toString('base64');
}

/**
 * Given a base64 encoded string, returns its ascii string
 * @param encodedStr
 * @returns {string}
 */
function decodeFromBase64(encodedStr) {
    const buffer = new Buffer(encodedStr, 'base64');
    return buffer.toString('ascii');
}

exports.getScanResults = async function (req, res) {
    const gatewayScanner = new GatewayScanner(10000); //gateway scanner which scans for 10 secs
    const gatewaysInRange = []; //list of ip addresses of the gateways that are in range of the auxiliary device

    /*
    Whenever a new gateway is discovered in proximity by the scanner, add it to the gatewayInRange list.
    Note: On an OSX machine, we don't get the MAC address of the peripheral from the BLE advertisement using noble.
    Instead what we get is a temporary id from noble. Once we obtain the link graph, we will store the actual gatewayId
    rather than this tempId.
     */
    gatewayScanner.on("peripheral-discovered", function (tempId, gatewayIP) {
        gatewaysInRange.push(gatewayIP);
    });

    gatewayScanner.on("scan-complete", async () => {
        /*
        Once the scan is complete, we display three items on the UI page:
            gateways in range, all gateways in the network, uri of the link graph visualization
        */
        const gatewaysInRangeMap = {}; //gatewayId -> gatewayIP
        const allGatewaysMap = {}; //gatewayId -> gatewayIP
        var linkGraphVisualUrl = ""; //link to the visualization of the link graph data

        //if there is at least one gateway in range, then take the first ip as sample and then get the entire link
        //graph from that
        if (gatewaysInRange.length > 0) {
            const sampleIP = gatewaysInRange[0];
            const linkGraph = await getLinkGraphData(sampleIP);
            //record the link to the linkgraph visualization
            linkGraphVisualUrl = `http://${sampleIP}:5000/platform/link-graph-visual`;

            //find all the gateways
            for (const entry of Object.entries(linkGraph["data"])) {
                const gatewayId = entry[0];
                const gatewayIP = entry[1]["ip"];
                allGatewaysMap[gatewayId] = encodeToBase64(gatewayIP);

                //fill in the missing gatewayId field for the discovered gateways
                if (gatewaysInRange.includes(gatewayIP)) {
                    gatewaysInRangeMap[gatewayId] = encodeToBase64(gatewayIP);
                }

                //TODO why??
                //keep the mac and ip address mappings for future requests
                await keyv.set(gatewayId, gatewayIP);
            }
        }

        const data = {
            "gatewaysInRangeMap": gatewaysInRangeMap,
            "allGatewaysMap": allGatewaysMap,
            "linkGraphUrl": linkGraphVisualUrl,
            "encodeToBase64": encodeToBase64 //send the base64 encode function to nunjucks to encode GET params
        };
        res.render('scanned-devices.nunjucks', data);
    });
};

//TODO if there is a repo merge of on-the-edge and hoos-nearby, then all of these should go into utils
/**
 * Use the platform API to get the link graph data
 * @returns {Promise<any>} promise of the link graph json
 */
async function getLinkGraphData(gatewayIP) {
    const execUrl = `http://${gatewayIP}:5000/platform/link-graph-data`;
    const body = await request({method: 'GET', uri: execUrl});
    return JSON.parse(body);
}

/**
 * Uses the gateway API to query for the sensors connected to a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<any>}
 */
async function getSensorData(gatewayIP) {
    const execUrl = `http://${gatewayIP}:5000/gateway/sensors`;
    const body = await request({method: 'GET', uri: execUrl});
    return JSON.parse(body);
}

/**
 * Uses the gateway API to query for the neighbors of a given gateway
 * @param gatewayIP IP address of the gateway
 * @returns {Promise<any>} promise of a list of list of gateway_name and gateway_IP
 */
async function getNeighborData(gatewayIP) {
    const execUrl = `http://${gatewayIP}:5000/gateway/neighbors`;
    const body = await request({method: 'GET', uri: execUrl});
    return JSON.parse(body);
}

exports.getGatewayDetails = async function (req, res) {
    //receive the Base64 encoded GET params from the nunjucks page
    const encodedGatewayId = req.query.id;
    const encodedGatewayIP = req.query.ip;

    if(encodedGatewayId && encodedGatewayIP) {
        const gatewayId = decodeFromBase64(encodedGatewayId);
        const gatewayIP = decodeFromBase64(encodedGatewayIP);

        //get sensors
        const sensors = await getSensorData(gatewayIP);
        sensors.forEach(sensor => {
            const receiver = sensor["receiver"];
            sensor["receiver"] = receiver.split("-")[0];
        });

        //get neighbors
        const neighbors = await getNeighborData(gatewayIP);

        const data = {
            "gatewayId": gatewayId,
            "gatewayIP": gatewayIP,
            "sensors": sensors,
            "neighbors": neighbors
        };

        res.render("gateway-page.nunjucks", data);
    } else {
        res.sendStatus(404);
    }
};
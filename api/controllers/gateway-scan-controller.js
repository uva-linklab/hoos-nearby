const GatewayScanner = require('../../gateway-scanner-lite/gateway-scanner-lite');
const gatewayScanner = GatewayScanner.getInstance();
const utils = require('../../utils/utils');

/**
 * Given a subset of gateways of the gateway platform, this function obtains the link graph and extracts parts of it for displaying on the UI
 * @param gatewaysInRange
 * @return {Promise<{data}>}
 */
async function _getNetworkData(gatewaysInRange) {
    const gatewaysInRangeMap = {}; //gatewayId -> gatewayIP
    const allGatewaysMap = {}; //gatewayId -> gatewayIP
    const appsMap = {}; // gatewayIp -> [apps]
    const deviceMap = {}; // deviceId -> details
    let linkGraphVisualUrl = ""; //link to the visualization of the link graph data

    let platformLastRestartTime = 0;
    let platformLastRestartTimeStr = "";

    //if there is at least one gateway in range, then take the first ip as sample and then get the entire link
    //graph from that
    if(gatewaysInRange.length > 0) {
        const sampleIP = gatewaysInRange[0];
        const linkGraph = await utils.getLinkGraphData(sampleIP);
        //record the link to the link graph visualization
        linkGraphVisualUrl = utils.getLinkGraphVisualUrl(sampleIP);

        //find all the gateways
        for (const entry of Object.entries(linkGraph["data"])) {
            const gatewayId = entry[0];
            const gatewayIP = entry[1]["ip"];
            allGatewaysMap[gatewayId] = gatewayIP;

            //fill in the missing gatewayId field for the discovered gateways
            if(gatewaysInRange.includes(gatewayIP)) {
                gatewaysInRangeMap[gatewayId] = gatewayIP;
            }

            // keep concatenating the apps of each gateway to the appsList
            appsMap[gatewayIP] = entry[1]["apps"];

            // to remove duplicate devices, we keep a map indexed on the deviceId
            const devices = entry[1]["devices"];
            devices.forEach(device => deviceMap[device['id']] = device);

            // get the gateway's start time
            const startTime = (await utils.getGatewayStartTime(gatewayIP))['startTime'];
            // compute the platform's start time as the latest time a gateway was started
            platformLastRestartTime = Math.max(platformLastRestartTime, startTime);
        }
    }

    if(platformLastRestartTime !== 0) {
        const date = new Date(platformLastRestartTime);
        platformLastRestartTimeStr = `${date.toDateString()}, ${date.toLocaleTimeString()}`;
    }

    return {
        "gatewaysInRangeMap": gatewaysInRangeMap,
        "allGatewaysMap": allGatewaysMap,
        "linkGraphUrl": linkGraphVisualUrl,
        "appsMap": appsMap,
        "devices": Object.values(deviceMap), // get a list of the device details from the map
        "platformLastRestartTime": platformLastRestartTimeStr,
        "encodeToBase64": utils.encodeToBase64 //send the base64 encode function to nunjucks to encode GET params
    };
}

exports.getScanResults = async function (req, res) {
    const gatewaysInRange = []; //list of ip addresses of the gateways that are in range of the auxiliary device

    gatewayScanner.startScanning(5000); // scan for 5 seconds

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
        const data = await _getNetworkData(gatewaysInRange);
        res.render('scanned-devices.nunjucks', data);
    });
};

// to be used only in localMode!
exports.getBypassedScanResults = async function(req, res) {
    const gatewaysInRange = [utils.getGatewayIp()]; // sets the gateway's IP address to be used for later data extraction
    const data = await _getNetworkData(gatewaysInRange);
    res.render('scanned-devices.nunjucks', data);
};

exports.getGatewayDetails = async function(req, res) {
    //receive the Base64 encoded GET params from the nunjucks page
    const encodedGatewayId = req.query.id;
    const encodedGatewayIP = req.query.ip;

    if(encodedGatewayId && encodedGatewayIP) {
        const gatewayId = utils.decodeFromBase64(encodedGatewayId);
        const gatewayIP = utils.decodeFromBase64(encodedGatewayIP);

        const devices = await utils.getDeviceData(gatewayIP);
        const neighbors = await utils.getNeighborData(gatewayIP);

        const data = {
            "gatewayId": gatewayId,
            "gatewayIP": gatewayIP,
            "devices": devices,
            "neighbors": neighbors
        };

        res.render("gateway-page.nunjucks", data);
    } else {
        res.sendStatus(404);
    }
};

exports.getAppDetails = async function(req, res) {
    const appId = req.query.id;
    const encodedAppName = req.query.name;
    const encodedGatewayIp = req.query.gatewayIp;

    if(encodedAppName && encodedGatewayIp) {
        const appName = utils.decodeFromBase64(encodedAppName);
        const gatewayIp = utils.decodeFromBase64(encodedGatewayIp);

        const app = {
            'id': appId,
            'name': appName,
            'gatewayIp': gatewayIp
        };
        res.render('app-page.nunjucks', app);
    } else {
        res.sendStatus(404);
    }
};
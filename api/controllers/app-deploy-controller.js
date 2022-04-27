const fs = require('fs-extra');
const utils = require('../../utils/utils');
const path = require('path');

exports.renderAppDeployPage = async function(req, res){
    //receive the Base64 encoded GET params from the nunjucks page
    const encodedGatewayIP = req.query.ip;

    if(encodedGatewayIP) {
        const gatewayIP = utils.decodeFromBase64(encodedGatewayIP);

        const linkGraph = await utils.getLinkGraphData(gatewayIP); //get the link graph
        const linkGraphData = linkGraph["data"]; //{"G1": {"devices": [{"id": "d1",..}, {},..], ..}, "G2": {},...}

        const gateways = Object.keys(linkGraphData); //get the gateway ids => ["G1", "G2",..]
        const allDeviceIds = gateways.flatMap(gateway =>
            linkGraphData[gateway]["devices"].map(deviceData => deviceData["id"])
        ); //[["d1", "d2"], ["d3", ..], ...]

        // allDeviceIds still contains duplicate deviceIds, since two gateways can have the same deviceId
        // remove duplicates by creating a set and then converting back to a list
        const deviceList = Array.from(new Set(allDeviceIds));
        deviceList.sort(); // sort to make it better formatted in the UI
        const data = {
            /*
            pass on the gateway IP so that once the form submission happens on the app-deploy-page, the deployApp
            function can use the gatewayIP to get the link graph of the network
             */
            "gatewayIP": gatewayIP,
            "devices": deviceList
        };
        res.render("app-deploy-page.nunjucks", data);
    } else {
        res.sendStatus(404);
    }
};

function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        console.error(err);
    }
}

exports.deployApp = async function (req, res) {
    //Get the POST data
    const appPath = req["files"]["app"][0]["path"]; //path to the app
    const devices = req.body.devices; //list of deviceIds
    const runtime = req.body.runtime;

    let deviceList = [];
    if(devices) {
        // check `devices` type. if only 1 device is selected, req.body.devices will be a string. Otherwise, it will be an array.
        deviceList = typeof devices === "string" ? [devices] : devices;
    }

    const metadata = {
        "devices": {
            "ids": deviceList
        },
        "runtime": runtime
    };

    // TODO can we send the metadata as json object without having to write it to file? for now, just use previous logic
    //store the metadata to a file
    const metadataPath = path.join(__dirname, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));
    // any path inside the appFiles is sent using the HTTP multipart thingy
    const appFiles = {
        app: appPath,
        metadata: metadataPath
    };

    // get the randomly picked gateway ip
    const gatewayIP = req.body.gatewayIP;
    let deploymentAlertMessage;
    utils.scheduleAppOnGatewayPlatform(gatewayIP, appFiles)
        .then(() => {
            deploymentAlertMessage = "App deployed on gateway network!";
        })
        .catch(() => {
            deploymentAlertMessage = "Error Occurred!";
        })
        .finally(() => {
            console.log(`app deployed on ${gatewayIP}`);
            res.render("deployment-response-page.nunjucks", {
                "deploymentAlertMessage": deploymentAlertMessage
            });
            deleteFile(appPath);
            deleteFile(metadataPath);
        });
};

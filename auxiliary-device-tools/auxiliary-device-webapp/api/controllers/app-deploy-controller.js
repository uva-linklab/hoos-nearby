const utils = require("../../../../utils");
const appDeployer = require("../../../app-deployer");

exports.renderAppDeployPage = async function(req, res){
    //receive the Base64 encoded GET params from the nunjucks page
    const encodedGatewayIP = req.query.ip;

    if(encodedGatewayIP) {
        const gatewayIP = utils.decodeFromBase64(encodedGatewayIP);

        const linkGraph = await utils.getLinkGraphData(gatewayIP); //get the link graph
        const linkGraphData = linkGraph["data"]; //{"G1": {"sensors": [{"_id": "s1",..}, {},..], ..}, "G2": {},...}

        const gateways = Object.keys(linkGraphData); //get the gateway ids => ["G1", "G2",..]
        const allSensorIds = gateways.map(gateway =>
            linkGraphData[gateway]["sensors"].map(sensorData => sensorData["_id"])
        ); //[["s1", "s2"], ["s3", ..], ...]

        //flatten the sensor id list
        //flat and flatMap are only available in Node.js 11.0.0, so use reduce and concat each of the sensor list
        //together with the starting accumulator as an empty list []
        const flattenedSensorList =
            allSensorIds.reduce((acc,sensors) => acc.concat(sensors)); //["s1", "s2", "s3",...]

        //sensorList still contains duplicate sensorIds, since two gateways can have the same sensor id
        //remove duplicates by creating a set and then converting back to a list
        const sensorList = Array.from(new Set(flattenedSensorList));

        const data = {
            /*
            pass on the gateway IP so that once the form submission happens on the app-deploy-page, the deployApp
            function can use the gatewayIP to get the link graph of the network
             */
            "gatewayIP": gatewayIP,
            "sensors": sensorList
        };
        res.render("app-deploy-page.nunjucks", data);
    } else {
        res.sendStatus(404);
    }
};

exports.deployApp = async function (req, res) {
    //Get the POST data
    const appPath = req["files"]["app"][0]["path"]; //path to the app
    const sensors = req.body.sensors; //list of sensor ids
    const gatewayIP = req.body.gatewayIP;

    //generate the link graph
    const linkGraph = await utils.getLinkGraphData(gatewayIP);

    //deploy the app
    appDeployer.deployApp(appPath, sensors, linkGraph, function(isDeploymentSuccessful) {
        const deploymentAlertMessage = isDeploymentSuccessful ? "App deployed on gateway network!" :
            "App deployment failed!";

        const data = {
            "deploymentAlertMessage": deploymentAlertMessage
        };
        res.render("deployment-response-page.nunjucks", data);
    });
};
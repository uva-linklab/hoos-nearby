const utils = require("../../../../utils");
const appDeployer = require("../../../app-deployer");

exports.renderAppDeployPage = async function(req, res){
    //receive the Base64 encoded GET params from the nunjucks page
    const encodedGatewayIP = req.query.ip;

    if(encodedGatewayIP) {
        const gatewayIP = utils.decodeFromBase64(encodedGatewayIP);

        const linkGraph = await utils.getLinkGraphData(gatewayIP);
        const linkGraphData = linkGraph["data"];

        const gateways = Object.keys(linkGraphData);
        const allSensorIds = gateways.map(gateway =>
            linkGraphData[gateway]["sensors"].map(sensorData => sensorData["_id"]));

        //TODO use better impl. flatMap and flat did not work on node older version
        //TODO there are duplicate sensors. Remove that.
        const sensorList = allSensorIds.reduce((acc,sensors) => acc.concat(sensors));

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
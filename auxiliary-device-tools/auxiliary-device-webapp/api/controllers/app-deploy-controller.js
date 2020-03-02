const path = require('path');
const { spawn } = require('child_process');

exports.renderAppDeployPage = async function(req, res){
    //TODO get this from req.
    const sampleIP = "172.27.44.129";
    //TODO link graph
    const linkGraph = await getAppResponse(sampleIP, "linkGraph");

    const linkGraphData = linkGraph["data"];
    const gateways = Object.keys(linkGraphData);
    console.log(gateways);
    const allSensorIds = gateways.map(gateway => {
        const sensors = linkGraphData[gateway]["sensors"];
        const sensorIds = sensors.map(sensorData => {
            return sensorData["_id"];
        });
        return sensorIds;
    });

    //TODO use better impl. flatMap and flat did not work on node older version
    // var sensors = [];
    // for(var sensorList of allSensorIds) {
    // 	console.log(sensorList);
    // 	sensors = sensors.concat(sensorList);
    // 	console.log(sensors);
    // }
    const sensorList = allSensorIds.reduce((acc,sensors) => acc.concat(sensors));
    console.log(sensorList);
    // const sensors = [
    // 	"5a28f0f77c0f",
    // 	"0575f0f77c0f",
    // 	"f745f0f77c0f",
    // 	"d075f0f77c0f",
    // 	"a145f0f77c0f",
    // 	"b175f0f77c0f",
    // 	"3d669891df8c",
    // 	"9c28f0f77c0f",
    // 	"8fc79891df8c",
    // 	"3b28f0f77c0f",
    // 	"1675f0f77c0f"
    // ];

    // console.log(sensors);
    const data = {
        "sensors": sensorList
    };

    res.render("code-deploy-page.nunjucks", data)
};

exports.deployApp = async function (req, res) {
    const deployerPath = path.join(__dirname, "../app-deployer/deployer");
    console.log(deployerPath);

    console.log(req.body);

    //TODO fix this
    // const codePath = req.body.codepath;
    const codePath = path.join(__dirname, "../app-deployer/test-code/test.js");
    const sensors = req.body.sensors;

    const sensorList = sensors.reduce((acc, sensor) => acc + "," + sensor);
    // console.log(sensorList);

    const codeProcess = spawn('node', [deployerPath, codePath, sensorList]);

    codeProcess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
    });

    codeProcess.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    codeProcess.on('exit', (data) => {
        console.log("script exited");
    });
    res.end();
};
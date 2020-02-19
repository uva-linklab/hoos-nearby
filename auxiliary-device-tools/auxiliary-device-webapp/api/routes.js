const webpageRenderController = require("./controllers/webpage-render-controller");
const gatewayDetailsController = require("./controllers/gateway-details-controller");
const appDeployController = require("./controllers/app-deploy-controller");

module.exports = function(app) {
    app.get('/', webpageRenderController.renderIndexPage);
    app.get('/gateway', gatewayDetailsController.getGatewayDetails);
    app.get('/scan', gatewayDetailsController.getScanResults);
    app.get('/app-deployer', appDeployController.renderAppDeployPage);
    app.post('/deploy', appDeployController.deployApp);
};
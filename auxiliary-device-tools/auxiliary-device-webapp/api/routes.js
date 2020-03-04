const multer  = require('multer');
const fs = require('fs');

const webpageRenderController = require("./controllers/webpage-render-controller");
const gatewayScanController = require("./controllers/gateway-scan-controller");
const appDeployController = require("./controllers/app-deploy-controller");

module.exports = function(app) {
    //setup multipart form-data which allows clients to upload code and mapping files for execution
    //accepts two files. one with the form name as "code" and another called "metadata"
    const uploader = getMultipartFormDataUploader();

    app.get('/', webpageRenderController.renderIndexPage);
    app.get('/gateway', gatewayScanController.getGatewayDetails);
    app.get('/scan', gatewayScanController.getScanResults);
    app.get('/app-deployer', appDeployController.renderAppDeployPage);
    app.post('/deploy', uploader.fields([{name: 'app'}]), appDeployController.deployApp);
};

/**
 * This function returns a multer object after setting up the directory used to store the uploaded files. The function
 * also sets the relevant fields for the multer upload package used for multipart form-data.
 * @returns {multer|undefined}
 */
function getMultipartFormDataUploader() {
    //store the uploaded files to deployed-apps directory. Create this directory if not already present.
    const tempAppsDirPath = `${__dirname}/../temp-apps-dir/`;
    if (!fs.existsSync(tempAppsDirPath)){
        fs.mkdirSync(tempAppsDirPath);
    }

    const multerStorage = multer.diskStorage({
        //set the storage destination
        destination: function (req, file, cb) {
            cb(null, tempAppsDirPath);
        },
        //use the original filename as the multer filename
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
    });
    return multer({ storage: multerStorage });
}
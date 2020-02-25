const NetworkInteractionManager = require('../../network-interaction-manager');
const networkInteractionManager = new NetworkInteractionManager();
networkInteractionManager.disseminateAll("testData", {"a":"b"});
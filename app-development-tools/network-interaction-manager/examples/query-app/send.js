const NetworkInteractionManager = require('../../network-interaction-manager');
const networkInteractionManager = new NetworkInteractionManager();

//Send a query with the tag queryData. Wait for its response with the tag queryDataResponse.
networkInteractionManager.queryAll("queryData", "queryDataResponse", {"data": "someData"});

networkInteractionManager.on('disseminate-all', function(tag, data) {
    if(tag === 'queryDataResponse') {
        console.log(`obtained query response data - ${data}`);
    }
});
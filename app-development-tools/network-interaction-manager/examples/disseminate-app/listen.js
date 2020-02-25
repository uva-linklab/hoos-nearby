const NetworkInteractionManager = require('../../network-interaction-manager');
const networkInteractionManager = new NetworkInteractionManager();

networkInteractionManager.on('disseminate-all', function(tag, data) {
	if(tag === 'testData') {
		console.log(`obtained disseminate-all data - ${data}`);
		console.log(data["_meta"]["origin-address"]);
	}
});
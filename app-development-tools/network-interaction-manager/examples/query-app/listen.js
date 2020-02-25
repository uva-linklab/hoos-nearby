const NetworkInteractionManager = require('../../network-interaction-manager');
const networkInteractionManager = new NetworkInteractionManager();

networkInteractionManager.on('disseminate-all', function(tag, data) {
	if(tag === 'queryData') {
		console.log(`obtained query - ${data}`);
		const replyTag = data["_meta"]["reply-tag"];
		networkInteractionManager.disseminateAll(replyTag, {"data": "queryResponseGoesHere"});
	}
});
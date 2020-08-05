const request = require('request-promise');
const fs = require('fs-extra');

/**
 * Post the files as multi-part form data to a specified uri.
 * @param uri
 * @param files
 * @param successCallback
 * @param failureCallback
 */
exports.transferFiles = function (uri, files, successCallback, failureCallback) {
	const readStreamObjects = {};
	for (const formField in files) {
		const filePath = files[formField];
		readStreamObjects[formField] = fs.createReadStream(filePath);
	}

	const options = {
	    method: 'POST',
	    uri: uri,
	    formData: readStreamObjects
	};

	request(options)
		.then(successCallback)
		.catch(failureCallback);
};
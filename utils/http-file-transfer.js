const request = require('request-promise');
const fs = require('fs-extra');

/**
 * Post the files as multi-part form data to a specified uri.
 * @param uri
 * @param files
 */
exports.transferFiles = function (uri, files) {
	const readStreamObjects = {};
	Object.keys(files).forEach(formField => {
		const filePath = files[formField];
		readStreamObjects[formField] = fs.createReadStream(filePath);
	});

	const options = {
	    method: 'POST',
	    uri: uri,
	    formData: readStreamObjects
	};

	return request(options);
};
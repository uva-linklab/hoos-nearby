const express = require('express');
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const argv = require('yargs')(process.argv.slice(2)).argv;

// localMode: if we're running hoos-nearby on a nexusedge gateway directly rather than on an auxiliary device
const localMode = !!argv.local; // if undefined => false, otherwise true

const app = express();
const port = (process.env.PORT || 4000);

//nunjucks
const PATH_TO_TEMPLATES = __dirname + '/api/views';
nunjucks.configure(PATH_TO_TEMPLATES, {
    autoescape: true,
    express: app
});
nunjucks.installJinjaCompat(); //for accessing additional filters like .values() on dictionary in nunjucks

//body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//static folder
app.use(express.static(__dirname + '/public'));

//Describe API endpoints in api/routes.js
const routes = require(__dirname + '/api/routes');
routes(app, {
    localMode: localMode
});

app.listen(port, function() {
    console.log(`Auxiliary Device Webapp started on port ${port}`)
});

//throw an error if it is an unknown endpoint
app.use(function(req, res) {
    res.status(404).send(`${req.originalUrl} is not a valid endpoint.`);
});
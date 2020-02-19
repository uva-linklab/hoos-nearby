const express = require('express');
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');

const app = express();
const port = (process.env.PORT || 4000);

//nunjucks
const PATH_TO_TEMPLATES = __dirname + '/api/views';
nunjucks.configure(PATH_TO_TEMPLATES, {
    autoescape: true,
    express: app
});

//body parser 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//static folder
app.use(express.static(__dirname + '/public'));

//Describe API endpoints in api/routes.js
const routes = require(__dirname + '/api/routes');
routes(app);

app.listen(port, function() {
    console.log(`Auxiliary Device Webapp started on port ${port}`)
});

//throw an error if it is an unknown endpoint
app.use(function(req, res) {
    res.status(404).send(`${req.originalUrl} is not a valid endpoint.`);
});
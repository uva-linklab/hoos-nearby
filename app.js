const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const path = require('path');
const nunjucks = require('nunjucks');
//init app
const app = express();

//nunjucks
const PATH_TO_TEMPLATES = './templates';
nunjucks.configure(PATH_TO_TEMPLATES, {
    autoescape: true,
    express: app
});

//body parser 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

const port = (process.env.PORT || 4000);
app.set('port', port);

app.listen(port, function() {
	console.log(`Server started on port ${port}`)
});
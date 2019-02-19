const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const path = require('path');
//init app
const app = express();

//view engine
app.set('views', path.join(__dirname), 'views');
// app.engine('handlebars', exphbs({defaultLayout: 'layout'}));
// app.set('view engine', 'handlebars');

//body parser 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
// app.use('/users', users);


const port = (process.env.PORT || 4000);
app.set('port', port);

app.listen(port, function() {
	console.log(`Server started on port ${port}`)
});
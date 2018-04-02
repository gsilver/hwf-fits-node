// set up ======================================================================
var express = require('express');
var app = express();
var port = process.env.PORT || 8090;
var morgan = require('morgan');

app.use(express.static('./public'));
app.use(morgan('dev'));
require('./routes.js')(app);

app.listen(port);
console.log("App listening on port " + port);

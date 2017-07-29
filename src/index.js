var express = require('express');
var app = express();
var ExpressPeerServer = require('peer').ExpressPeerServer;

var server = app.listen(process.env.PORT || 1337);

var options = {
    debug: false
}
app.use('/', express.static("wwwroot"));
app.use('/api', ExpressPeerServer(server, options));


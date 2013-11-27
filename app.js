#!/usr/bin/env node

require('js-yaml');
var express = require('express')
  , http = require('http')
  , app = express()
  , server = http.createServer(app)
  , path = require('path')
  , fs = require('fs')
  , io = require('socket.io').listen(server)

  , db = require('./lib/db')
  , config = require('./lib/config')

  , sockets = require('./routes/socket')
  , alerts = require('./routes/alerts')
  , oauth = require('./routes/oauth')
  , todos = require('./routes/todos')
  , api = require('./routes/api');

// all environments
app.set('port', process.env.PORT || config.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
// app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(config.SECRET));
app.use(express.session());
app.use(app.router);

// most things go through here
app.use(express.static(path.join(__dirname, 'static')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

api.addRoutes(app);
oauth.addRoutes(app);
alerts.addRoutes(app);
todos.addRoutes(app);
sockets.attach(io)

var index = function(req, res) {
  res.send(fs.readFileSync(path.join(__dirname, 'static', 'index.html')).toString('utf8'));
};

app.get('/', oauth.hostChecker, index);

var pages = require('./assets/pages');
Object.keys(pages.routes).forEach(function(page){
  app.get(page, oauth.hostChecker, index);
});

db.onload(function () {
  server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
});

#!/usr/bin/env node

require('js-yaml');
var express = require('express')
  , http = require('http')
  , app = express()
  , server = http.createServer(app)
  , path = require('path')
  , fs = require('fs')

  , config = require('./config.yaml')
  , oauth = require('./routes/oauth')
  , api = require('./routes/api');

// all environments
app.set('port', process.env.PORT || config.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
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

var index = function(req, res) {
  res.send(fs.readFileSync(path.join(__dirname, 'static', 'index.html')).toString('utf8'));
};

app.get('/', index);

var pages = require('./assets/pages');
Object.keys(pages.routes).forEach(function(page){
  app.get(page, index);
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

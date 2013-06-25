// Include required modules
require('js-yaml');
var OAuth = require('oauth').OAuth
  , debug = require('debug')('familyfound:oauth')
  , util = require('util')
  , fs = require('familysearch').single()

  , config = require('../config.yaml')
  , callback_path = '/oauth/callback'
  , API_BASE = 'https://api.familysearch.org/identity/v2/'
  , oa = createOAuth(API_BASE, config.OAUTH_KEY, config.OAUTH_SECRET,
                     config.HOST + ':' + config.PORT + callback_path);

var Unauthorized = function () {
  Error.apply(this, arguments);
};
util.inherits(Unauthorized, Error);

function checkLogin(req, res, next) {
  if (req.session.oauth && req.session.oauth.access_token) {
    return next();
  }
  if (!req.headers.authorization) {
    return res.send(401, {error: 'Not logged in'});
  }
  // coming from extension, check the session token
  req.session.oauth = {
    access_token: req.headers.authorization.split(' ')[1]
  };
  return getData(req.session.oauth.access_token, function (err, data) {
    if (err) {
      debug('Error check-login get data. Probably old session', err);
      req.session.destroy();
      // am I allowed to do this?
      return res.send(401, {error: 'Not logged in'});
    }
    req.session.userId = data.id;
    return next();
  });
}

function createOAuth(apiBase, key, secret, callbackUrl) {
  return new OAuth(
    apiBase + "request_token",
    apiBase + "access_token",
    key,
    secret,
    "1.0",
    callbackUrl,
    "PLAINTEXT",
    true // do the auth in the URL, not the Authorization header
  );
};

function getData(token, next) {
  fs.get('current-user', {}, token, function (err, data) {
    if (err) return next(err);
    next(null, data.users[0]);
  });
}

// Create the rule to start the login process on Twitter
function check_login(req, res) {
  if (req.session.oauth && req.session.oauth.access_token) {
    res.cookie('already oauthed', req.session.oauth.access_token);
    return getData(req.session.oauth.access_token, function (err, data) {
      if (err) {
        debug('Error check-login get data. Probably old session', err);
        req.session.destroy();
        // am I allowed to do this?
        return check_login(req, res);
      }
      req.session.userId = data.id;
      return res.send({authorized: true, data: data});
    });
  }
  debug('step 1');
  // First, request a Token user the OAuth object created with oauth module
  oa.getOAuthRequestToken(function(err, token, secret) {
    if (err) {
      debug("An error happened on getOAuthRequestToken : ");
      debug(err);
      return res.send({authorized: false,
                error: 'Unable to connect to familysearch.org for authorization'});
    }
    req.session.oauth = {
      token: token,
      secret: secret
    };
    debug('step 1 successful', req.session.oauth);

    res.send({authorized: false, url: API_BASE + 'authorize?oauth_token=' + token});
  });
}

function callback(req, res) {
  if (!req.session.oauth) {
    debug('step 2 - uninitialized');
    req.session.destroy();
    return res.render('oauth-status', {
      title: 'Failed to login',
      response: {
        authorized: false,
        error: 'No session found...'
      }
    });
  }
  debug('step 2');
  var oauth = req.session.oauth;
  oauth.verifier = req.query.oauth_verifier;

  // The user is verified. Now we can ask for an access token
  oa.getOAuthAccessToken(oauth.token, oauth.secret, oauth.verifier, 
    function(err, access_token, access_secret, results){
      if (err){
        debug("Error while getting the Access Token");
        req.session.destroy();
        return res.render('oauth-status', {
          title: 'Failed to login',
          response: {
            authorized: false,
            error: err
          }
        });
      }
      // Store the access token in the session
      req.session.oauth.access_token = access_token;
      req.session.oauth.access_secret = access_secret;
      res.cookie('oauth', access_token);
      return getData(access_token, function (err, data) {
        req.session.userId = data.id;
        return res.render('oauth-status', {
          title: 'Login successful!',
          response: {
            authorized: true,
            data: data,
            error: err
          }
        });
      });
    }
  );
} 

function hostChecker(req, res, next) {
  var protocol;
  if (req.headers['x-forwarded-proto']) {
    protocol = req.headers['x-forwarded-proto'];
  } else {
    protocol = req.protocol;
  }
  var host = protocol + '://' + req.headers.host.split(':')[0];
  if (host !== config.HOST) {
    debug('Got request from invalid host', host, req.headers.host, config.HOST);
    return res.send(404, 'Wrong host');
  }
  return next();
}

exports.addRoutes = function (app) {
  app.get('/oauth/check-login', hostChecker, check_login);
  app.get(callback_path, hostChecker, callback);
};
exports.hostChecker = hostChecker;
exports.checkLogin = checkLogin;



require('js-yaml');
var _ = require('lodash')
  , path = require('path')
  , CONFIG_FILE = process.env.CONFIG_FILE || path.join(__dirname, '../config.yaml');

var vbls = [
  // familysearch API key
  'OAUTH_KEY',
  // familysearch doesn't currently use a "secret"
  'OAUTH_SECRET',
  // the host name
  'HOST',
  // if it's different from HOST[:PORT]. OAUTH callback to here
  'CALLBACK_HOST',
  // for encrypting session cookie, etc.
  'SECRET',
  // the port to listen on
  'PORT',
  // the URI of the mongo database. Format: mongodb://[user:pass@]host[:port]/dbname
  'MONGO'
];

module.exports = {};

vbls.forEach(function (name) {
  module.exports[name] = process.env[name] || '';
});

try {
  _.extend(module.exports, require(CONFIG_FILE));
} catch (e) {
}



require('js-yaml');
var _ = require('lodash')
  , path = require('path')
  , CONFIG_FILE = process.env.CONFIG_FILE || path.join(__dirname, '../config.yaml');

var vbls = ['OAUTH_KEY', 'OAUTH_SECRET', 'HOST', 'SECRET', 'PORT', 'MONGO'];

module.exports = {};

vbls.forEach(function (name) {
  module.exports[name] = process.env[name] || '';
});

try {
  _.extend(module.exports, require(CONFIG_FILE));
} catch (e) {
}


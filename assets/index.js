
var request = require('superagent')
  , angular = require('angularjs')
  , settings = require('settings')
  , angularSettings = require('angular-settings')
  , dialog = require('dialog')
  // , debug = require('debug')('familyfound:main')

  , app = require('./angular')
  , pages = require('./pages')
  , oauth = require('./oauth');

function showError(err) {
  console.error(err);
  dialog('Page Error', 'Sorry, an error occurred on the page. Please refresh.')
    .addClass('error-modal')
    .modal()
    .show();
}

function toCamelCase(title) {
  return title[0].toLowerCase() + title.slice(1);
}

var mainControllers = {

  PersonView: function ($scope, user) {
    $scope.rootPerson = null;
    user(function(user) {
      request.get('/api/person/' + user.personId)
        .end(function (err, req) {
          if (err) { return console.error('Failed to get person'); }
          console.log('Got person', req.body);
          $scope.rootPerson = req.body;
        });
    });
  }

};

for (var key in pages.routes) {
  app.addRoute(key,
               toCamelCase(pages.routes[key]) + '.html',
               mainControllers[pages.routes[key]]);
}

app.run(function () {
});

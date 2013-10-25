
var routes = {}
  , request = require('superagent')
  , fan = require('fan')
  , promise = require('promise')
  , todo = require('todo')
  , breadcrumb = require('breadcrumb')
  , oauth = require('./oauth');

var app = module.exports = angular.module('familyfound', ['ngResource', 'settings', 'fan', 'todo', 'breadcrumb'])
  .config(['$routeProvider', '$locationProvider', function(route, location) {
    Object.keys(routes).forEach(function (path) {
      route.when(path, routes[path]);
    });
    route.otherwise({redirectTo: '/'});
    location.html5Mode(true);
  }]).run(function($location) {
    if (location.pathname !== '/')
      $location.path(location.pathname);
  });

app.addRoute = function (path, tpl, ctrl) {
  routes[path] = {
    templateUrl: tpl,
    controller: ctrl
  };
};

require('angular-resource');

app.factory('user', function() {
  return promise(oauth.check, function (err, data) {
    if (err) {
      return console.error('Failed to get user');
    }
    console.log('Got user!', data);
  });
});

app.directive('personVitals', function () {
  return {
    replace: true,
    restrict: 'A',
    scope: {
      person: '=personVitals'
    },
    templateUrl: 'person-vitals.html'
  };
});

app.filter('trunk', function () {
  return function (text, ln) {
    ln = ln || 20
    if (!text || text.length <= ln) return text
    return text.slice(0, ln-3) + '...';
  }
});

app.directive('personDetails', ['ffapi', function (ffapi) {
  return {
    replace: true,
    restrict: 'A',
    scope: {
      person: '=personDetails'
    },
    templateUrl: 'person-details.html',
    link: function (scope, el, attrs) {
      scope.notNull = function (item) {
        return !!item;
      }
      scope.childClass = function (person) {
        if (!person || person.display && (!person.display.age || person.display.age < 20)) return '';
        var num = numChildren(person.familyIds);
        if (num <= 1) return 'one-child';
        if (num < 4) return 'few-children';
        return '';
      };
      scope.loading = 0
      scope.numChildren = numChildren;
      scope.$watch('person', function (person) {
        if (!person || !person.familyIds || !Object.keys(person.familyIds).length) return
        if (!person.families) person.families = {}
        // XXX should we make sure all of the families are loaded? idk
        if (Object.keys(person.families).length) return
        scope.loading = 0
        var histItem = {
          id: person.id,
          link: '/person/' + person.id,
          // add in date range here?
          name: person.display.name + ' (' + person.display.lifespan + ')',
          direction: null
        };
        for (var spouse in person.familyIds) {
          if (!person.families[spouse]) person.families[spouse] = []
          for (var i=0; i<person.familyIds[spouse].length; i++) {
            if (person.families[spouse] && person.families[spouse][i]) continue;
            if (person.families[spouse].length <= i) person.families[spouse].push(null)
            scope.loading += 1
            ffapi.relation(person.familyIds[spouse][i], got.bind(null, spouse, i))
          }
        }
        function got(spouse, i, data, cached) {
          scope.loading -= 1
          person.families[spouse][i] = data
          data.line = [histItem]
          data.line = person.line.concat(data.line)
          if (!cached) scope.$digest()
        }
      })
    }
  };
}]);

function numChildren(families) {
  var num = 0;
  for (var spouse in families) {
    num += families[spouse].length - 1;
  }
  return num;
}

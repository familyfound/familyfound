
// main client-side script

var request = require('superagent')
  , angular = require('angularjs')
  , settings = require('settings')('familyfound')
  , angularSettings = require('angular-settings')
  , dialog = require('dialog')

  , defaultSettings = require('./settings')
  , app = require('./angular')
  , pages = require('./pages')
  , oauth = require('./oauth');

settings.config(defaultSettings);

require('settings')().set('ffapi.cache', 'session');

// require('settings')().set('ffapi.main.ffhome', '/'); // don't need external url

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

var loadPeople = function (get, base, scope, gens) {
  if (gens <= 0) {
    base.hideParents = true;
    return null;
  }
  base.hideParents = false;
  if (base.fatherId) {
    get(base.fatherId, function (data, cached) {
        base.father = data;
        loadPeople(get, base.father, scope, gens - 1);
        if (!cached) scope.$digest();
      });
  }
  if (base.motherId) {
    get(base.motherId, function (data, cached) {
        base.mother = data;
        loadPeople(get, base.mother, scope, gens - 1);
        if (!cached) scope.$digest();
      });
  }
  Object.keys(base.familyIds).forEach(function (spouseId) {
    if (!base.families[spouseId]) base.families[spouseId] = [null];
    for (var i=0; i<base.familyIds[spouseId].length; i++) {
      base.families[spouseId].push(null);
      get(base.familyIds[spouseId][i], function (i, data, cached) {
        base.families[spouseId][i] = data;
        if (!cached) scope.$digest();
      }.bind(null, i));
    }
  });
};

app.controller('NavController', function ($scope, $location) {
  $scope.activeItem = function (item) {
    var path = $location.path();
    if (item.path === path) return true;
    if (item.match && path.indexOf(item.path) === 0) {
      return true;
    }
    return false;
  };
  $scope.subNav = pages.subNav;
});

var mainControllers = {

  TodoView: function ($scope, $route, $location, user, ffapi) {
    $scope.removeTodo = function (todo) {
      var i = $scope.todos.owned.indexOf(todo);
      if (i === -1) {
        console.warn('trying to remove unknown todo', todo);
        return;
      }
      $scope.todos.owned.splice(i, 1);
      ffapi('todos/remove', {id: todo._id});
      $scope.$digest();
    };

    user(function(user) {
      var personId = $route.current.params.id || user.personId;
      request.get('/api/todos/list')
        .end(function (err, req) {
          if (err) return console.error('Failed to get todos');
          $scope.todos = req.body;
          $scope.todos.owned.forEach(function (todo) {
            todo.owned = true;
            todo.watching = false;
            todo.done = !!todo.completed;
          });
          $scope.todos.watching.forEach(function (todo) {
            todo.owned = false;
            todo.watching = true;
            todo.done = !!todo.completed;
          });
          $scope.$digest();
        });
      request.get('/api/alerts/list')
        .end(function (err, req) {
          if (err) return console.error('Failed to get alerts');
          $scope.alerts = req.body;
          $scope.$digest();
        });
    });
  },

  PersonView: function ($scope, $route, $location, user, ffapi) {
    $scope.rootPerson = null;
    $scope.fanConfig = {
      gens: settings.get('main.displayGens'),
      links: false,
      width: 800,
      height: 600,
      center: {x: 400, y: 400},
      ringWidth: 30,
      doubleWidth: true,
      tips: true,
      onNode: function (el, person) {
        el.on('click', function () {
          $location.path('/person/' + person.id);
          $scope.$root.$digest();
        });
      }
    };
    $scope.clickBox = function (person, node) {
      console.log('clicked', person, node);
      person.hideParents = true;
      $location.path('/person/' + person.id);
      $scope.$apply();
    };
    $scope.goBack = function () {
      if (!$scope.rootPerson.mainChild) return;
      if ($scope.rootPerson.mainChild.id === user.personId) {
        $location.path('/');
      } else {
        $location.path('/person/' + $scope.rootPerson.mainChild.id);
      }
      $scope.rootPerson.hideParents = true;
      $scope.apply();
    };
    user(function(user) {
      var personId = $route.current.params.id || user.personId;
      ffapi.relation(personId, function (person, cached) {
        $scope.rootPerson = person;
        loadPeople(ffapi.relation, person, $scope, settings.get('main.displayGens'));
        if (!cached) $scope.$digest();
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

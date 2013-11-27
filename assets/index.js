
// main client-side script

var request = require('superagent')
  , angular = require('angularjs')
  , settings = require('settings')('familyfound')
  , angularSettings = require('angular-settings')
  , breadcrumb = require('breadcrumb')
  , dialog = require('dialog')
  , svgDownload = require('svg-download')
  , d3 = require('d3')
  , fan = require('fan')
  , statuses = require('statuses')

  , utils = require('./utils')
  , diags = require('./diagnostics')
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

var loadPeople = function (get, base, scope, gens, gen) {
  if (gens <= 0) {
    base.hideParents = true;
    return null;
  }
  base.hideParents = false;
  if (!base.line) {
    base.line = getHistory(base.id);
  }
  // console.log('load', base.id, base.display.name, base.line.length);
  var histItem = {
    id: base.id,
    link: '/person/' + base.id,
    // add in date range here?
    name: base.display.name + ' (' + base.display.lifespan + ')',
    direction: null
  }
    , childLine = base.line.concat([histItem])
  if (base.fatherId) {
    get(base.fatherId, childLine, gen + 1, function (data, cached) {
      base.father = data;
      data.line = [histItem]
      data.line = base.line.concat(data.line)
      setHistory(data.id, data.line);
      loadPeople(get, base.father, scope, gens - 1, gen + 1);
      if (!cached) scope.$digest();
    });
  }
  if (base.motherId) {
    get(base.motherId, childLine, gen + 1, function (data, cached) {
      base.mother = data;
      data.line = [histItem]
      data.line = base.line.concat(data.line)
      setHistory(data.id, data.line);
      loadPeople(get, base.mother, scope, gens - 1, gen + 1);
      if (!cached) scope.$digest();
    });
  }
  if (gen === 0 && 'object' === typeof base.familyIds) {
    Object.keys(base.familyIds).forEach(function (spouseId) {
      if (!base.families[spouseId]) base.families[spouseId] = [null];
      function got(i, data, cached) {
        base.families[spouseId][i] = data;
        data.line = [histItem]
        data.line = base.line.concat(data.line)
        if (!cached) scope.$digest();
      }
      for (var i=0; i<base.familyIds[spouseId].length; i++) {
        base.families[spouseId].push(null);
        get(base.familyIds[spouseId][i], childLine, gen + 1, got.bind(null, i));
      }
    });
  }
};

function sourcery(node, sources) {
  var ind = node.indicators[0]
  ind.classed('many-sources', sources && sources.length > 2)
    .classed('few-sources', sources && sources.length > 0 && sources.length < 3)
    .classed('shown', sources && sources.length > 0)
}

function indicate(node, person) {
  sourcery(node, node.gen < 5 && person.sources)
  person.diagnostics = diags.diagnose(person)
  if (person.status === 'complete') {
    node.indicators[1].classed('shown', false)
    node.indicators[2].classed('shown', false)
    return
  }
  diags.classify(node.indicators[1], node.indicators[2], person.diagnostics)
}

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

function storeKey(pid) {
  return 'breadcrumb.' + pid;
}

function getHistory(pid) {
  // console.log('getting for pid', pid);
  var key = storeKey(pid);
  if (localStorage[key]) {
    try {
      var ret = JSON.parse(localStorage[key]);
      return ret;
    } catch (e) {}
  }
  return [];
}

function setHistory(pid, history) {
  // console.log('setting for pid', pid, history.length);
  var key = storeKey(pid);
  localStorage[key] = JSON.stringify(history);
}

var helpText = "<b>Inactive:</b> Research has not yet begun.<br>" +
  "<b>Active:</b> Research is in progress.<br>" +
  "<b>Clean:</b> Duplicates have been resolved and existing data has been checked for reasonableness.<br>" +
  "<b>Complete:</b> All data is found, sources have been attached, etc.";

var mainControllers = {

  RelatedView: require('./controllers/related'),

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

    $scope.loadingTodos = true;
    user(function(user, usercached) {
      var personId = $route.current.params.id || user.personId;
      request.get('/api/todos/list')
        .end(function (err, req) {
          $scope.loadingTodos = false;
          if (err) return console.error('Failed to get todos');
          if (req.status == 401) {
            console.error('Not authorized....');
            return window.location.reload();
          }
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

  PhotosView: function ($scope, $route, $location, $compile, user, ffapi) {
    $scope.loadingPeople = 1;
    user(function(user) {
      var personId = $route.current.params.id || user.personId;
      // console.log('getting for', personId);
      $scope.history = getHistory(personId);
      var get = function (pid, next) {
        $scope.loadingPeople++;
        ffapi.relation(pid, function (person, cached) {
          $scope.loadingPeople--;
          next(person, cached);
        });
      };
      ffapi.relation(personId, function (person, cached) {
        $scope.rootPerson = person;
        $scope.loadingPeople--;
        loadPeople(get, person, $scope, settings.get('main.displayGens')  - 1, true);
        if (!cached) $scope.$digest();
      });
    });
  },

  PersonView: function ($scope, $route, $location, $compile, user, ffapi) {
    $scope.rootPerson = null;

    // Breadcrumbs
    $scope.bcConfig = {front:20, back: 20};
    $scope.history = [];
    $scope.ffapi = ffapi;
    ffapi.resetCounter();

    function navigate(person, direction) {
      ffapi.resetCounter();
      $location.path('/person/' + person.id);
      $scope.$root.$digest();
    }

    $scope.clearCache = function () {
      if ($scope.rootPerson.id === $scope.user.personId) {
        return ffapi.clear(function () {
          location.reload()
        })
      }
      ffapi.clearFrom($scope.rootPerson.id, function () {
        location.reload();
      })
    };

    $scope.focusedPerson = $scope.rootPerson;

    $scope.printConfig = {
      printable: true,
      gens: settings.get('main.displayGens'),
      links: false,
      families: false,
      width: 1200,
      height: 900,
      center: {x: 600, y: 600},
      ringWidth: 40,
      doubleWidth: true,
      tips: false
    };
    function focus(person, el) {
      return function () {
        if (d3.event.button !== 2) return
        $scope.focusedPerson = person
        $scope.$digest()
        d3.selectAll('path.focused', el[0][0].parentElement).classed('focused', false)
        el.classed('focused', true)
        d3.event.preventDefault()
        d3.event.stopPropagation()
        return false
      }
    }
    function onPerson(el, person, node) {
      el.on('mousedown', focus(person, el))
      el.on('contextmenu', function () {d3.event.preventDefault()});
      if (person.display && (person.display.lifespan && person.display.lifespan.match(/Living/i))) return
      var kids = 0;
      for (var spouse in person.familyIds) {
        // list starts w/ the id of the spouse
        kids += person.familyIds[spouse].length - 1;
      }
      indicate(node, person)
    }
    var NODES = {}
    $scope.$watch('rootPerson', function () {
      NODES = {}
    })

    function stratify(node, status) {
      statuses.forEach(function (status) {
        node.el.classed(status, false)
      })
      node.el.classed(status, true)
    }
    ffapi.on('status:changed', function (pid, status) {
      if (!NODES[pid]) return
      stratify(NODES[pid], status)
    })
    $scope.fanConfig = {
      gens: settings.get('main.displayGens'),
      links: false,
      width: 650,
      height: 475,
      center: {x: 325, y: 350},
      ringWidth: 35,
      doubleWidth: false,
      // sources, children, data cleanup
      indicators: [true, true, true],
      resize: true,
      minHeight: 300,
      families: false,
      tips: utils.tip,
      onParent: function (el, person, node) {
        NODES[person.id] = node
        el.on('click', function () {
          navigate(person, 'up');
        });
        onPerson(el, person, node)
      },
      onRoot: function (el, person, node) {
        NODES[person.id] = node
        if (!person.display || (person.display.lifespan && person.display.lifespan.match(/Living/i))) return
        onPerson(el, person, node)
      }
    };
    $scope.downloadFan = function ($event) {
      if ($scope.loadingPeople > 0) {
        // console.log('still loading', $scope.loadingPeople);
        return;
      }
      var svg = document.getElementById('download-tree').firstElementChild;
      $event.target.href = svgDownload('Family Tree: ' + $scope.rootPerson.display.name, svg, fan.stylesheet);
    };
    $scope.loadingPeople = 1;
    user(function(user, usercached) {
      $scope.user = user
      var personId = $route.current.params.id || user.personId;
      // console.log('getting for', personId);
      // $scope.history = getHistory(personId);
      /*
      function getPhoto(pid, person) {
        ffapi.photo(pid, function (photo, cached) {
          person.photo = photo.thumbSquareUrl;
          person.photolink = 'https://familysearch.org/tree/#view=ancestor&person=' + pid;
          // if (!cached) $scope.$digest();
        });
      }
      */
      function getSources(pid, person) {
        // $scope.loadingPeople++;
        ffapi.sources(pid, function (sources, cached) {
          person.sources = sources;
          if (NODES[pid]) sourcery(NODES[pid], sources)

          // $scope.loadingPeople--;
          if (!cached) $scope.$digest();
        });
      }
      var get = function (pid, line, gen, next) {
        if (arguments.length === 2) {
          next = line
          line = null
        }
        $scope.loadingPeople++;
        ffapi.relation(pid, line, function (person, cached) {
          $scope.loadingPeople--;
          // getPhoto(pid, person);
          if (gen < 5) getSources(pid, person);
          next(person, cached);
        });
      };
      ffapi.relation(personId, function (person, cached) {
        $scope.focusedPerson = $scope.rootPerson = person;
        $scope.loadingPeople--;
        // getPhoto(personId, person);
        loadPeople(get, person, $scope, settings.get('main.displayGens')  - 1, 0);
        if (!usercached || !cached) $scope.$digest();
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

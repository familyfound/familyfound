
var app = require('./angular')
  , alertTemplate = require('./alert-tpl');

app.directive('alert', function () {
  return {
    scope: {},
    replace: false,
    template: alertTemplate,
    restrict: 'A',
    link: function (scope, element, attrs) {
      var name = attrs.alert;
      scope.$parent.$watch(name, function(value) {
        scope.alert = value;
      });
      scope.$watch('alert', function(value) {
        scope.$parent[name] = value;
      });
    }
  };
});


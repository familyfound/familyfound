
var angular = require('angularjs')
  // , settings = require('settings')
  // , angularSettings = require('angular-settings')
  , boxes = require('familyfound');

// angularSettings.factory('settings', settings.getSettings());

function Tester($scope) {
  $scope.alert = {
    person: 'KWX-3E',
    todo: {
      description: "Do this fix thing",
      type: 'General',
      person: 'KWX-3E',
      user: 'user.MMZSD'
    }
  };
  $scope.todo = {
    description: "Do this fix thing",
    type: 'General',
    person: 'KWX-3E',
    user: 'user.MMZSD'
  };
}

angular.module('test', ['familyfound']);


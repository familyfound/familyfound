
var cookie = require('cookie')

module.exports = ['$scope', '$route', '$location', 'user', 'ffapi', 'io', function ($scope, $route, $location, user, ffapi, io) {
  // num: number of people crawled
  // up: number up
  // down: number back down.
  // ex: 3up 0down = great-grandparents; 4up, 4down = third cousins
  $scope.numSearched = 0

  io.on('related-cancelled', function (reason) {
    $scope.findingRelationship = false
    $scope.relatedError = reason
    $scope.$digest()
  })
  io.on('related-update', function (num, generations) {
    $scope.numSearched = num
    $scope.gensSearched = generations
    $scope.$digest()
  })
  io.on('related-finished', function (line) {
    $scope.relatedLine = line
    $scope.findingRelationship = false
    $scope.$digest()
  })

  $scope.findingRelationship = false

  user(function(user, usercached) {
    var personId = $route.current.params.id
    $scope.user = user
    $scope.relatedPersonId = personId
    if (!personId) return
    $scope.findingRelationship = true
    io.emit('find-related', cookie('oauth'), user.personId, personId);
    if (!usercached) $scope.$digest()
  })

  $scope.findRelationship = function () {
    if (!$scope.relatedPersonId) return
    $location.path('/find-relation/' + $scope.relatedPersonId)
    $scope.relatedLine = false;
    $scope.relatedError = false;
  }
}]


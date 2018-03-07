// inject the  service factory into our controller
scheduleApp.controller('mainController', ['$scope','$http','Get', function($scope, $http, Get) {
  //triggered with button click
  var userId = $scope.instructorInput;
  $scope.clickGetCourses = function (userId) {

    Get.getCourses(userId)
      .success(function(data) {
        $scope.courses = data;
        $scope.loading = false;
        _.each($scope.courses, function(course){
          Get.getCourse(courseId)
           .success(function(data) {
             // push to course list
             // this will depend on a counter i
             $scope.loading = false;
         });
       });
    });
  };

}]);

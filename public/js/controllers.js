// inject the  service factory into our controller
scheduleApp.controller('mainController', ['$scope','$http', '$log', 'Get', function($scope, $http, $log, Get) {
  //triggered with button click
  var userId = $scope.instructorInput;
  $scope.clickGetCourses = function (userId) {
    $log.info('controller request');
    Get.getCourses(userId)
      .then(function(data) {
        $log.info(data);
        if(data.data.httpCode === 200) {
          $scope.courses = data;
          $scope.loading = false;
          _.each($scope.courses, function(course){
            Get.getCourse(courseId)
             .then(function(data) {
             // push to course list
             // this will depend on a counter i
             $scope.loading = false;
           });
         });
       } else {
         $log.warn(data.data.httpCode + ', ' + data.data.httpMessage + ', ' + data.data.moreInformation);
       }
    });
  };

}]);

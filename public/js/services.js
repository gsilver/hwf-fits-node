  scheduleApp.factory('Get', ['$http',function($http) {
    return {
      getCourses : function(userId) {
        return $http.get('/api/courses/' + userId);
      },
      getCourse : function(courseId) {
        return $http.get('/api/course/' + courseId);
      }
    };
  }]);

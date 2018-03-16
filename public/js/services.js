scheduleApp.factory('Get', function($http, $rootScope, $log) {
  return {
    getCourses: function(termId, userId) {
      $log.info('factory request for courses for term ' + termId + ' for user ' + userId);
      return $http.get('/api/courses/' + termId + '/' + userId).then(function(data) {
        return data;
      });
    },
    getCourse: function(termId, courseId) {
      return $http.get('/api/course/' + termId + '/' + courseId).then(function(data) {
        return data;
      });
    },
    getTokens: function(scope) {
      return $http.get('/api/tokens/' + scope).then(function(data) {
        return data;
      });
    },
    getBuildings: function(url) {
      return $http.get(url).then(
        function success(result) {
          return result;
        },
        function error(result) {
          $log.warn(url, result.status, result.data.errors);
          return result;
        }
      );
    },
  };
});

scheduleApp.factory('Get', function($http, $rootScope, $log) {
  return {
    // call node rest api (in routes.js) to get terms from ESB
    getTerms: function() {
      $log.info('factory request for terms');
      return $http.get('/api/terms/').then(function(data) {
        return data;
      });
    },
    getMComm: function(userId) {
      $log.info('factory request for MComm info');
      return $http.get('/api/mcomm/' + userId).then(function(data) {
        return data;
      });
    },
    // call node rest api (in routes.js) to get courses from ESB
    getCourses: function(termId, userId) {
      $log.info('factory request for courses for term ' + termId + ' for user ' + userId);
      return $http.get('/api/courses/' + termId + '/' + userId).then(function(data) {
        return data;
      });
    },
    // call node rest api (in routes.js) to get course details from ESB
    getCourse: function(termId, courseId) {
      return $http.get('/api/course/' + termId + '/' + courseId).then(function(data) {
        return data;
      });
    },
    // call node rest (in routes.js) api to get tokens from ESB
    getTokens: function(scope) {
      return $http.get('/api/tokens/' + scope).then(function(data) {
        return data;
      });
    },
    // read local file with the building information
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

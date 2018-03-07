  scheduleApp.factory('Get', ['$http',function($http) {
    return {
      getCourses : function(userId) {
        console.log('service request');
        return $http.get('/api/courses/' + userId).then(function(data){
          //ESB will return a 200, with an object that  reveals the actual
          // status code i.e.
          //{ "httpCode":"401", "httpMessage":"Unauthorized", "moreInformation":"Client id not registered." }
          // so will need to examp the payload status code
          return data;
        });
      },
      getCourse : function(courseId) {
        return $http.get('/api/courses/' + courseId).then(function(data){
          //ESB will return a 200, with an object that  reveals the actual
          // status code i.e.
          //{ "httpCode":"401", "httpMessage":"Unauthorized", "moreInformation":"Client id not registered." }
          // so will need to examp the payload status code
          return result;
        });

      }
    };
  }]);

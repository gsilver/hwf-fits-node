//TODO: bower install arrow-js --save
//TODO: port ics parser
//TODO: port building parser
//TODO: delete old js files when done
//TODO: package Bower/Grunt

// inject the  service factory into our controller
scheduleApp.controller('mainController', ['$scope','$http', '$log', 'Get', function($scope, $http, $log, Get) {
  // this will need to come from ESB on page load
  //$scope.terms = [{"TermCode":2210,"TermDescr":"Fall 2018","TermShortDescr":"FA 2018"},{"TermCode":2200,"TermDescr":"Summer 2018","TermShortDescr":"SU 2018"},{"TermCode":2190,"TermDescr":"Spring/Summer 2018","TermShortDescr":"SS 2018"},{"TermCode":2180,"TermDescr":"Spring 2018","TermShortDescr":"SP 2018"},{"TermCode":2170,"TermDescr":"Winter 2018","TermShortDescr":"WN 2018"}]



  $scope.terms = [
    {id:'2170', name: 'Winter 2018'},
    {id:'2180', name:'Spring 2018'},
    {id:'2190', name:'Summer 2018'},
    {id:'2120', name:'Spring-Summer 2018'},
  ];
  //set the selected term to the first item in array
  //TODO - may need to do sort the array by term id when we get it from ESB
  $scope.termInput = $scope.terms[0];

  //triggered with button click
  $scope.clickGetCourses = function () {
    var termId = $scope.termInput.id;
    var userId = $scope.instructorInput;
    $scope.classListSchedule =[];
    $log.info('controller request for courses for term ' + termId + ' for user ' + userId);
    Get.getCourses(termId, userId)
      .then(function(data) {


        if(data.data.statusCode === 200) {
          var parsedBody = JSON.parse(data.data.body);
          $scope.courses = parsedBody.getInstrClassListResponse.InstructedClass;
          if($scope.courses.length === undefined){
            $scope.courses = [].concat($scope.courses);
          }
          $scope.loading = false;
          _.each($scope.courses, function(course){
            $log.warn(course);
            Get.getCourse(termId, course.ClassNumber)
             .then(function(data) {
               var parsedBody = JSON.parse(data.data.body);
               console.log(parsedBody.getSOCSectionListByNbrResponse.ClassOffered);
               $scope.classListSchedule.push(parsedBody.getSOCSectionListByNbrResponse.ClassOffered);
             //courseList.push// push to course list
             // this spinner will depend on a counter i
             $scope.loading = false;
           });
         });
       } else {
         $log.warn(data.data.httpCode + ', ' + data.data.httpMessage + ', ' + data.data.moreInformation);
       }
    });
  };

}]);

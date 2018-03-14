//TODO: bower install arrow-js --save
//TODO: port ics parser (and deal with multimeeting classes)
//TODO: port building parser
//TODO: delete old js files when done
//TODO: package Bower/Grunt

// inject the  service factory into our controller
scheduleApp.controller('mainController', ['$scope','$http', '$log', 'Get', function($scope, $http, $log, Get) {
  // this will need to come from ESB on page load
  //$scope.terms = [{"TermCode":2210,"TermDescr":"Fall 2018","TermShortDescr":"FA 2018"},{"TermCode":2200,"TermDescr":"Summer 2018","TermShortDescr":"SU 2018"},{"TermCode":2190,"TermDescr":"Spring/Summer 2018","TermShortDescr":"SS 2018"},{"TermCode":2180,"TermDescr":"Spring 2018","TermShortDescr":"SP 2018"},{"TermCode":2170,"TermDescr":"Winter 2018","TermShortDescr":"WN 2018"}]

  Get.getBuildings('data/location/buildings.json').then(function(buildingData) {
    $scope.buildings= buildingData.data;
  });


  $scope.terms = [
    {id:'2170', name: 'Winter 2018'},
    {id:'2180', name:'Spring 2018'},
    {id:'2190', name:'Summer 2018'},
    {id:'2120', name:'Spring-Summer 2018'},
  ];
  //set the selected term to the first item in array
  //TODO - may need to do sort the array by term id when we get it from ESB
  $scope.termInput = $scope.terms[0];

  // get the tokens on page load
  Get.getTokens('instructors')
    .then(function(data) {});
  Get.getTokens('umscheduleofclasses')
      .then(function(data) {});

  //triggered with button click
  $scope.clickGetCourses = function () {
    $scope.catastrophicError = false;
    //start spinner
    $scope.loading = true;
    var termId = $scope.termInput.id;
    var userId = $scope.instructorInput;
    $scope.classListSchedule =[];
    Get.getCourses(termId, userId)
      .then(function(data) {
        if(data.data.statusCode === 200) {
          var parsedBody = JSON.parse(data.data.body);
          console.log(parsedBody);
          if(parsedBody.getInstrClassListResponse.InstructedClass){
            if($.isArray(parsedBody.getInstrClassListResponse.InstructedClass)){
              // ESB returns an array when multiple courses
              $scope.courses = parsedBody.getInstrClassListResponse.InstructedClass;
            }
            else {
              // ESB returns an object with one course - turn it into an array
              $scope.courses = [].concat(parsedBody.getInstrClassListResponse.InstructedClass);
            }
          } else {
            // ESB has returned nothing
            $scope.courses = [];
            $scope.loading = false;
          }

          // loop over courses array and call another API
          // to get course details
          _.each($scope.courses, function(course, i){
            Get.getCourse(termId, course.ClassNumber)
             .then(function(data) {
               var parsedBody = JSON.parse(data.data.body);
               if(parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting.length === undefined){
                 parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting = [].concat(parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting);
               }
               $scope.classListSchedule.push(parsedBody.getSOCSectionListByNbrResponse.ClassOffered);
               if(i + 1 === $scope.courses.length){
                 //done retrieving courses, stop spinner
                 $scope.loading = false;
               }
           });

         });
       } else {
         $scope.catastrophicError = true;
         $scope.loading=false;
         $log.warn(data);
         $log.warn(data.data.httpCode + ', ' + data.data.httpMessage + ', ' + data.data.moreInformation);
       }
    });
  };

  var getBuilding = function(building){
    var buildingArr = building.split(' ');
    var buildingObj =  _.findWhere($scope.buildings, {Abbreviation: buildingArr[1]});
    if(buildingObj){
        buildingArr = [buildingArr[0],buildingObj.Name];
    }
    return buildingArr.join(' ');
  };


  var downloadICS = function(iCal){
    iCal = "data:text/calendar;charset=utf-8," + iCal;
    var link = document.createElement("a");
    link.setAttribute("href", encodeURI(iCal));
    // the filename will need to be different for multiples
    link.setAttribute("download", $scope.instructorInput + '.ics');
    document.body.appendChild(link);
    setTimeout(function() {
      link.click();
    }, 800);
  };

  $scope.prepareICS = function(instructorInput){
    $scope.preparedEventList = [];
    _.each($scope.classListSchedule, function(course, courseindex){
      _.each(course.Meeting, function(meeting, i){
        var newCourse = $.extend(true, {}, course);
        newCourse.Meeting = meeting;
        $scope.preparedEventList.push(newCourse);
      });
    });


    var arrayLen = $scope.preparedEventList.length;
    var iCal ='BEGIN:VCALENDAR\n' +
    'VERSION:2.0\n' +
    'PRODID:-//CLASS//CALENDAR//GENERATOR//UMICH//EDU\n';

    _.each($scope.preparedEventList, function(course, i){
      var time = course.Meeting.Times.split(' - ');
      var timeStart = moment(time[0], 'HHA').format('k0000');
      var timeEnd = moment(time[1], 'HHA').format('k0000');
      var courseTopic = course.ClassTopic?course.ClassTopic:'';
      var building  = '';
      if(course.Meeting.Location ==='ARR'){
        building = 'ARR';
      } else {
        building = getBuilding(course.Meeting.Location) + ', University of Michigan, Ann Arbor';
      }
        getBuilding(course.Meeting.Location);
      var daysKeys = ['Mo','Tu', 'We', 'Th', 'Fr'];
      var days = [];
      _.each(daysKeys, function(key){
        if (course.Meeting.Days.includes(key)){
          days.push(key.toUpperCase());
        }
      });

      iCal = iCal +
      'BEGIN:VEVENT\n' +
      'SUMMARY:' + $scope.instructorInput + ' - ' + course.SubjectCode + ' ' + course.CatalogNumber + ' ' + course.SectionNumber + ' Meeting: ' + course.Meeting.MeetingNumber +'\n' +
      'TZID:US-Eastern\n' +
      'DTSTART:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeStart + '\n' +
      'DTEND:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeEnd + '\n' +
      'DTSTAMP:' + moment().format('YYYYMMDDT000000') + 'Z\n' +
      'RRULE:FREQ=WEEKLY;UNTIL=' + moment(course.Meeting.EndDate, 'MM/DD/YYYY').format('YYYYMMDDT000000') + 'Z;BYDAY=' + days.join() + '\n' +
      'UID:' + moment().format('x') + i + '-' + $scope.instructorInput + '@class-calendar-generator.umich.edu\n' +
      'DESCRIPTION:' + courseTopic + ' ' + course.CourseDescr + '\n' +
      'LOCATION:' + building + '\n' +
      'END:VEVENT\n';
      if (i + 1 === arrayLen){
        iCal = iCal + 'END:VCALENDAR';
        downloadICS(iCal);
      }
    });
  };
}]);

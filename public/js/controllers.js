//TODO: package with Bower/Grunt
//TODO: get terms from ESB

// inject the  service factory into our controller
scheduleApp.controller('mainController', ['$scope', '$http', '$log', 'Get', function($scope, $http, $log, Get) {
  // get buildings array from local file
  // long term get from ESB and cache
  Get.getBuildings('data/location/buildings.json').then(function(buildingData) {
    $scope.buildings = buildingData.data;
  });
  // this will need to come from ESB on page load
  $scope.terms = [{
      id: '2170',
      name: 'Winter 2018'
    },
    {
      id: '2180',
      name: 'Spring 2018'
    },
    {
      id: '2190',
      name: 'Summer 2018'
    },
    {
      id: '2120',
      name: 'Spring-Summer 2018'
    },
  ];
  //set the selected term to the first item in array
  //TODO - may need to do sort the array by term id when we get it from ESB
  $scope.termInput = $scope.terms[0];

  //get the tokens on page load
  // NOTE: getting tokens only when request for courses or course fail
  // with a 401
  Get.getTokens('instructors')
    .then(function(data) {});
  Get.getTokens('umscheduleofclasses')
    .then(function(data) {});

  //triggered with button click
  $scope.clickGetCourses = function() {
    //reset courses list
    $scope.courses = [];
    $log.info('getting courses');
    $scope.catastrophicError = false;
    //start spinner
    $scope.loading = true;
    var termId = $scope.termInput.id;
    var userId = $scope.instructorInput;
    //we will be pushing the course objects into this array
    $scope.classListSchedule = [];
    Get.getCourses(termId, userId)
      .then(function(data) {
        if (data.data.statusCode === 200) {
          var parsedBody = JSON.parse(data.data.body);
          if (parsedBody.getInstrClassListResponse.InstructedClass) {
            if ($.isArray(parsedBody.getInstrClassListResponse.InstructedClass)) {
              // ESB returns an array when multiple courses
              $scope.courses = parsedBody.getInstrClassListResponse.InstructedClass;
            } else {
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
          _.each($scope.courses, function(course, i) {
            Get.getCourse(termId, course.ClassNumber)
              .then(function(coursedata) {
                if (coursedata.data.statusCode === 200) {
                  var parsedBody = JSON.parse(coursedata.data.body);
                  if (parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting.length === undefined) {
                    // ESB has returned an object Meeting as there is only one, so turn into an array
                    parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting = [].concat(parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting);
                  }
                  //push this course object to the array
                  $scope.classListSchedule.push(parsedBody.getSOCSectionListByNbrResponse.ClassOffered);
                } else {
                if (coursedata.data.statusCode === 401) {
                    console.log('got a 401 on course');
                    Get.getTokens('umscheduleofclasses')
                      .then(function(data) {
                        $log.info('getting umsc token');
                        $scope.courses = [];
                        $scope.classListSchedule = [];
                        $scope.clickGetCourses();
                      });

                  }
                }
              });
              if (i + 1 === $scope.courses.length) {
                //done retrieving courses, stop spinner
                $scope.loading = false;
              }


          });
        } else {
          //ESB returned something other than a 200
          if (data.data.statusCode === 401) {
            console.log('got a 401 on courses');
            Get.getTokens('instructors')
              .then(function(data) {
                $log.info('getting instructors token');
                $scope.clickGetCourses();
              });
          } else {
            $scope.loading = false;
            $scope.catastrophicError = true;
          }
          //
          // $scope.catastrophicError = true;
          //$scope.loading = false;
          // $log.warn(data);
          // $log.warn(data.data.httpCode + ', ' + data.data.httpMessage + ', ' + data.data.moreInformation);
        }
      });
  };

  var getBuilding = function(building) {
    //given a string, split it and look for the second term in the building array
    // which is the building abbreviation
    var buildingArr = building.split(' ');
    var buildingObj = _.findWhere($scope.buildings, {
      Abbreviation: buildingArr[1]
    });
    if (buildingObj) {
      // if found, use the returned full building name
      buildingArr = [buildingArr[0], buildingObj.Name];
    }
    // returned the initial string with the
    // second term now the building full name (sometimes)
    return buildingArr.join(' ');
  };


  var downloadICS = function(iCal) {
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


  // need to manipulate the array to produce as many objects
  // as Meeting objects all of the array objects contain
  // this is so that the conversion to ICS is more straigthforward
  $scope.prepareICS = function(instructorInput) {
    $scope.preparedEventList = [];
    _.each($scope.classListSchedule, function(course, courseindex) {
      _.each(course.Meeting, function(meeting, i) {
        var newCourse = $.extend(true, {}, course);
        newCourse.Meeting = meeting;
        $scope.preparedEventList.push(newCourse);
      });
    });


    //initialie the iCal
    var arrayLen = $scope.preparedEventList.length;
    var iCal = 'BEGIN:VCALENDAR\n' +
      'VERSION:2.0\n' +
      'PRODID:-//CLASS//CALENDAR//GENERATOR//UMICH//EDU\n';
    // loop through the preparedEventList and create an event for each object in array
    _.each($scope.preparedEventList, function(course, i) {
      // munge some values
      var time = course.Meeting.Times.split(' - ');
      var timeStart = moment(time[0], 'HHA').format('k0000');
      var timeEnd = moment(time[1], 'HHA').format('k0000');
      var courseTopic = course.ClassTopic ? course.ClassTopic : '';
      var building = '';
      // lookup the building if needed
      if (course.Meeting.Location === 'ARR') {
        building = 'ARR';
      } else {
        building = getBuilding(course.Meeting.Location) + ', University of Michigan, Ann Arbor';
      }
      // turn the problematic string of MoWeFr or TuThFr into an array
      var daysKeys = ['Mo', 'Tu', 'We', 'Th', 'Fr'];
      var days = [];
      _.each(daysKeys, function(key) {
        if (course.Meeting.Days.includes(key)) {
          days.push(key.toUpperCase());
        }
      });
      // assemble this event from oject values
      iCal = iCal +
        'BEGIN:VEVENT\n' +
        'SUMMARY:' + $scope.instructorInput + ' - ' + course.SubjectCode + ' ' + course.CatalogNumber + ' ' + course.SectionNumber + ' Meeting: ' + course.Meeting.MeetingNumber + '\n' +
        'TZID:US-Eastern\n' +
        'DTSTART:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeStart + '\n' +
        'DTEND:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeEnd + '\n' +
        'DTSTAMP:' + moment().format('YYYYMMDDT000000') + 'Z\n' +
        'RRULE:FREQ=WEEKLY;UNTIL=' + moment(course.Meeting.EndDate, 'MM/DD/YYYY').format('YYYYMMDDT000000') + 'Z;BYDAY=' + days.join() + '\n' +
        'UID:' + moment().format('x') + i + '-' + $scope.instructorInput + '@class-calendar-generator.umich.edu\n' +
        'DESCRIPTION:' + courseTopic + ' ' + course.CourseDescr + '\n' +
        'LOCATION:' + building + '\n' +
        'END:VEVENT\n';
      if (i + 1 === arrayLen) {
        // last array item, close and call download function
        iCal = iCal + 'END:VCALENDAR';
        downloadICS(iCal);
      }
    });
  };
}]);

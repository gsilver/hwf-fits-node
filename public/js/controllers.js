//TODO: package with Bower/Grunt
//TODO: use blob to force download for IE
scheduleApp.controller('mainController', ['$scope', '$http', '$log', 'Get', function($scope, $http, $log, Get) {
  // get buildings array from local file
  // long term get from ESB and cache
  Get.getBuildings('data/location/buildings.json').then(function(buildingData) {
    $scope.buildings = buildingData.data;
  });
  //get the tokens on page load
  Get.getTokens('instructors')
    .then(function(data) {});
  Get.getTokens('umscheduleofclasses')
    .then(function(data) {
      Get.getTerms().then(function(terms) {
        $scope.terms = [];
        _.each(terms.data.getSOCTermsResponse.Term, function(term) {
          $scope.terms.push({
            'id': term.TermCode,
            'name': term.TermDescr
          });
        });
        $scope.terms = _.sortBy($scope.terms, 'id');
        $scope.termInput = $scope.terms[0];
      });
    });

  $scope.instructorsNoCourses = [];
  $scope.catastrophicError = [];
  $scope.userListForICS = [];
  $scope.clickGetCoursesMult = function() {
    $scope.instructorsNoCourses = [];
    $scope.catastrophicError = [];
    $scope.filterActive = false;
    var userArrayTrimmed = [];
    //remove whitespace from each user
    if ($scope.instructorInputMult.split('\n').length) {
      $scope.instructorInputMultFail = false;
      _.each($scope.instructorInputMult.split('\n'), function(user) {
        userArrayTrimmed.push(user.trim());
      });
      // remove dupes and falsy values from array
      var userlist = _.compact(_.uniq(userArrayTrimmed));
      _.each(userlist, function(user) {
        $scope.instructorInput = user.trim();
        $scope.clickGetCourses($scope.instructorInput);
      });
    } else {
      $scope.instructorInputMultFail = true;
    }
  };

  //triggered with button click
  $scope.clickGetCourses = function() {
    $scope.filterActive = null;
    //reset courses list
    $scope.courses = [];
    $log.info('getting courses');
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
              $scope.userListForICS.push(userId);

            } else {
              // ESB returns an object with one course - turn it into an array
              $scope.courses = [].concat(parsedBody.getInstrClassListResponse.InstructedClass);
              $scope.userListForICS.push(userId);
            }
          } else {
            // ESB has returned nothing
            $scope.instructorsNoCourses.push(userId);
            $scope.courses = [];
            $scope.loading = false;
          }
          // loop over courses array and call another API
          // to get course details
          _.each($scope.courses, function(course, i) {
            Get.getCourse(termId, course.ClassNumber)
              .then(function(coursedata) {

                var parsedBody = coursedata.data;
                if (parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting.length === undefined) {
                  // ESB has returned an object Meeting as there is only one, so turn into an array
                  parsedBody.getSOCSectionListByNbrResponse.ClassOffered.uniqname = userId;
                  parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting = [].concat(parsedBody.getSOCSectionListByNbrResponse.ClassOffered.Meeting);
                }
                //push this course object to the array
                parsedBody.getSOCSectionListByNbrResponse.ClassOffered.uniqname = userId;
                parsedBody.getSOCSectionListByNbrResponse.ClassOffered.instructorRole = course.InstructorRole;
                $scope.classListSchedule.push(parsedBody.getSOCSectionListByNbrResponse.ClassOffered);
              });

            if (i + 1 === $scope.courses.length) {
              //done retrieving courses, stop spinner
              $scope.loading = false;
            }
          });
        } else {
          //ESB returned something other than a 200
          if (data.data.statusCode === 401) {
            $log.info('got a 401 on courses');
            Get.getTokens('instructors')
              .then(function(data) {
                Get.getTokens('umscheduleofclasses')
                  .then(function(data) {
                    //restart the whole request for classes, each indicidual class
                    $scope.clickGetCoursesMult();
                  });
              });
          } else {
            $scope.loading = false;
            $scope.catastrophicError.push(userId);
          }
        }
      });
  };

  //lookup building based on abbrv used in data (good luck)
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
    // second term now the building full name or the original
    // abbreviation if no matches found in building list
    return buildingArr.join(' ');
  };

  // download handler
  var downloadICS = function(iCal) {
    iCal = "data:text/calendar;charset=utf-8," + iCal;
    var link = document.createElement("a");
    link.setAttribute("href", encodeURI(iCal));
    // the filename will need to be different for multiples
    link.setAttribute("download", _.uniq($scope.userListForICS).join('-') + '.ics');
    document.body.appendChild(link);
    setTimeout(function() {
      link.click();
    }, 800);
  };

  // click handler for "download ICS" button
  $scope.prepareICS = function(instructorInput) {
    // need to manipulate the array to produce as many objects
    // as Meeting objects all of the array objects contain
    // this is so that the conversion to ICS is more straigthforward
    $scope.preparedEventList = [];
    _.each($scope.classListSchedule, function(course, courseindex) {

      if (course.instructorRole === 'Primary Instructor' && $scope.filterActive) {
        _.each(course.Meeting, function(meeting, i) {
          var newCourse = $.extend(true, {}, course);
          newCourse.Meeting = meeting;
          $scope.preparedEventList.push(newCourse);
        });
      }
      if (!$scope.filterActive) {
        _.each(course.Meeting, function(meeting, i) {
          var newCourse = $.extend(true, {}, course);
          newCourse.Meeting = meeting;
          $scope.preparedEventList.push(newCourse);
        });
      }
    });
    // get the envent length (so that when we loop
    // though the array we know when it is done and we can trigger the download)
    var arrayLen = $scope.preparedEventList.length;
    //initialie the iCal
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
        'SUMMARY:' + course.uniqname + ' - ' + course.SubjectCode + ' ' + course.CatalogNumber + ' ' + course.SectionNumber + ' Meeting: ' + course.Meeting.MeetingNumber + '\n' +
        'TZID:US-Eastern\n' +
        'DTSTART:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeStart + '\n' +
        'DTEND:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeEnd + '\n' +
        'DTSTAMP:' + moment().format('YYYYMMDDT000000') + 'Z\n' +
        'RRULE:FREQ=WEEKLY;UNTIL=' + moment(course.Meeting.EndDate, 'MM/DD/YYYY').format('YYYYMMDDT000000') + 'Z;BYDAY=' + days.join() + '\n' +
        'UID:' + moment().format('x') + i + '-' + course.uniqname + '@class-calendar-generator.umich.edu\n' +
        'DESCRIPTION:' + courseTopic + ' ' + course.CourseDescr + '\n' +
        'LOCATION:' + building + '\n' +
        'END:VEVENT\n';
      if (i + 1 === arrayLen) {
        // last array item, close ICS and call download function
        iCal = iCal + 'END:VCALENDAR';
        downloadICS(iCal);
      }
    });
  };

  //filter all users except Primary Instructor roles
  $scope.filterActive = false;
  $scope.filter = function(entry) {
    if ($scope.filterActive) {
      return (entry.instructorRole === 'Primary Instructor') ? true : false;
    }
    return true;
  };

}]);

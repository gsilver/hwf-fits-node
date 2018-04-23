
//TODO: package with Bower/Grunt
//TODO: use blob to force download for IE
scheduleApp.controller('mainController', ['$scope', '$http', '$log', 'Get', function($scope, $http, $log, Get) {
  // get buildings array from local file
  // long term get from ESB and cache
  Get.getBuildings('data/location/buildings.json').then(function(buildingData) {
    $scope.buildings = buildingData.data;
  });
  Get.getTokens('mcommunity').then(function(data){
    $scope.mcommAvailable = true;
  });

  //get the tokens on page load
  Get.getTokens('instructors')
    .then(function(data) {
      // should really check that the token was gotten
    });
    Get.getTokens('umscheduleofclasses')
      .then(function(data) {
        // should really check that the token was gotten
        Get.getTerms().then(function(terms) {
          $scope.terms = [];
          _.each(terms.data.getSOCTermsResponse.Term, function(term) {
            // used to populate the term select
            $scope.terms.push({
              'id': term.TermCode,
              'name': term.TermDescr
            });
          });
        // sort them by term id, so current will be the first
        $scope.terms = _.sortBy($scope.terms, 'id');
        // set the default term to the first (the current term)
        $scope.termInput = $scope.terms[0];
      });
    });

  //reset some result flags
  $scope.instructorsNoCourses = [];
  $scope.catastrophicError = [];

  // user clicks on "Lookup list" button
  $scope.clickGetCoursesMult = function() {
    // reset any previous lookup results and filters
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

  // triggered as many times as users are in the list
  $scope.clickGetCourses = function() {
    $scope.filterActive = null;
    //reset courses list
    $scope.courses = [];
    $log.info('getting courses for ' + $scope.instructorInput);
    //start spinner
    $scope.loading = true;
    // pick up term values (used in request) from select element
    var termId = $scope.termInput.id;
    var userId = $scope.instructorInput;
    //we will be pushing the course objects into this array
    $scope.classListSchedule = [];
    // get the courses for this instructor
    Get.getCourses(termId, userId)
      .then(function(data) {
        if (data.data.statusCode === 200) {
          var parsedBody = JSON.parse(data.data.body);
          if (parsedBody.getInstrClassListResponse.InstructedClass) {
            // ESB returns an array when multiple courses
            if ($.isArray(parsedBody.getInstrClassListResponse.InstructedClass)) {
              $scope.courses = parsedBody.getInstrClassListResponse.InstructedClass;
            } else {
              // ESB returns an object with one course - turn it into an array
              $scope.courses = [].concat(parsedBody.getInstrClassListResponse.InstructedClass);
            }
          } else {
            // ESB has returned nothing, add instructor to list of people we
            // found no courses for, stop the spinner
            $scope.instructorsNoCourses.push(userId);
            $scope.courses = [];
            $scope.loading = false;
          }
          // loop over courses array and call another API
          // to get course details
          _.each($scope.courses, function(course, i) {
            $log.info('getting details on course ' + course.SubjectCode + ' ' + course.CatalogNumber + ' ' + course.SectionNumber + ' ' + '(' + course.CatalogNumber + ')');
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
          //ESB returned something other than a 200, a token has probably expired
          if (data.data.statusCode === 401) {
            $log.info('got a 401 on courses');
            Get.getTokens('instructors')
              .then(function(data) {
                Get.getTokens('umscheduleofclasses')
                  .then(function(data) {
                    //restart the whole request for classes, each individual class
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

  //lookup building based on abbrv used in data (good luck! why is there no cannonical dictionary for this?)
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
    // filename set to uniqname list, concatenated and separated by dashes
    link.setAttribute("download", _.uniq(_.pluck($scope.preparedEventList, 'uniqname')).join('-') + '.ics');
    document.body.appendChild(link);
    setTimeout(function() {
      link.click();
    }, 800);
  };

  // click handler for "download ICS" button
  $scope.prepareICS = function(instructorInput) {
    // the $scope.classListSchedule array has a Meeting object or array of Meetings
    // and we are interested in creating a calendar entry for each meeting
    // so we need to manipulate the array to produce as many objects
    // as Meeting objects all of the array objects contain
    $scope.preparedEventList = [];
    _.each($scope.classListSchedule, function(course, courseindex) {
      // id the user has selected only Prim. Inst.  so only these meetings will be included
      if (course.instructorRole === 'Primary Instructor' && $scope.filterActive) {
        _.each(course.Meeting, function(meeting, i) {
          var newCourse = $.extend(true, {}, course);
          newCourse.Meeting = meeting;
          $scope.preparedEventList.push(newCourse);
        });
      }
      // no fiters active - so include all
      if (!$scope.filterActive) {
        _.each(course.Meeting, function(meeting, i) {
          var newCourse = $.extend(true, {}, course);
          newCourse.Meeting = meeting;
          $scope.preparedEventList.push(newCourse);
        });
      }
    });
    // get the event length (so that when we loop
    // though the array we know when it is done and we can trigger the download)
    var arrayLen = $scope.preparedEventList.length;
    //initialie the iCal
    var iCal = 'BEGIN:VCALENDAR\n' +
      'VERSION:2.0\n' +
      'PRODID:-//CLASS//CALENDAR//GENERATOR//UMICH//EDU\n';
    // loop through the $scope.preparedEventList array and create an event for each object in array
    _.each($scope.preparedEventList, function(course, i) {
      // munge some values into formats iCal likes
      var time = course.Meeting.Times.split(' - ');
      var timeStart = moment(time[0], 'HHA').format('k0000');
      var timeEnd = moment(time[1], 'HHA').format('k0000');
      // add course topic if exists
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
      // assemble this event from meeting object values and the munged values above
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


$scope.lookupMComm = function(){
  $scope.advisorDataList =[];
  $scope.advisorDataListCSV=[];
  $scope.mcloading=true;
  var userArrayTrimmed = [];
  //remove whitespace from each user

  if ($scope.mcommList.split('\n').length) {
    _.each($scope.mcommList.split('\n'), function(user, i) {
      userArrayTrimmed.push(user.trim());
    });
    // remove dupes and falsy values from array
    var userlist = _.compact(_.uniq(userArrayTrimmed));
      $scope.loopLength = userlist.length;
    _.each(userlist, function(user, i) {
      $scope.advisorInput = user.trim();
      $scope.clickMCommAff($scope.advisorInput, i);
    });
  } else {
    //$scope.instructorInputMultFail = true;
  }
};
//ESB data has the issue that it will produce an array, an object or a string
// so turn all suspect values to an array
var fixSillyESBShennanigans = function(thing){
  if(Array.isArray(thing)){
    return(thing);
  } else if((typeof thing === "object") && (thing !== null)){
    return([].concat(thing));
  } else {
    return([].concat(thing));
  }
};

$scope.clickMCommAff = function(user, i){
  Get.getMComm(user)
  .then(function(data) {
    if(i + 1 === $scope.loopLength){
      $scope.mcloading=false;
    }
    if (data.status === 200) {
      var advisor = data.data.person;
      $scope.advisorDataList.push({
        'uniqname':advisor.uniqname,
        'name':advisor.displayName,
        'affiliation':fixSillyESBShennanigans(advisor.affiliation),
        'title':fixSillyESBShennanigans(advisor.title),
        'address': fixSillyESBShennanigans(advisor.workAddress).join('\n\n').replace(/\$/g,'\n'),
        'phone': fixSillyESBShennanigans(advisor.workPhone)
      });
    } else {
      //ESB returned something other than a 200, a token has probably expired
      if (data.data.statusCode === 401) {
        $log.info('got a 401 asking about MComm person');
      }
    }
    if(i + 1 === $scope.loopLength){
      $scope.advisorDataList = _.sortBy($scope.advisorDataList, 'uniqname');
      $scope.mcloading=false;
    }
  });
};

  //filter all users except Primary Instructor roles (a toggle checkbox)
  $scope.filterActive = false;
  $scope.filter = function(entry) {
    if ($scope.filterActive) {
      return (entry.instructorRole === 'Primary Instructor') ? true : false;
    }
    return true;
  };
}]);

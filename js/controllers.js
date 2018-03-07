scheduleApp.controller('fitsController', ['$rootScope', '$scope', '$filter', '$timeout', '$log', 'getStuff', function($rootScope, $scope, $filter, $timeout, $log, getStuff) {
  $scope.downloadedICS=false;
  getStuff.getGenericStuff('data/location/buildings.json').then(function(buildingData) {
    $scope.buildings= buildingData.data;

  });
  $scope.lookUpPerson = function(instructorInput){
    $scope.courseFailures =[];
    getStuff.getGenericStuff('data/instructors/' + instructorInput + '.json').then(function(personData) {
      if(personData.status !== 200){
        $scope.lookUpPersonError = true;
        $scope.classList = null;
      } else {
        $scope.lookUpPersonError = false;
        var courses = personData.data.getInstrClassListResponse.InstructedClass;
        $scope.classListSchedule = [];
        _.each(courses, function(course){
          getStuff.getGenericStuff('data/courses/' + course.ClassNumber + '.json').then(function(courseData) {
            if(courseData.status !==200){
              $scope.courseFailures.push(course);
            } else {
              getBuilding(courseData.data.getSOCSectionListByNbrResponse.ClassOffered.Meeting.Location);
              courseData.data.getSOCSectionListByNbrResponse.ClassOffered.Meeting.Location = getBuilding(courseData.data.getSOCSectionListByNbrResponse.ClassOffered.Meeting.Location);
              //courseData.data.getSOCSectionListByNbrResponse.ClassOffered.Meeting.Location.split(' ');
              $scope.classListSchedule.push(courseData.data.getSOCSectionListByNbrResponse.ClassOffered);
            }
          });
        });
      }
    });
  };

  var getBuilding = function(building){
    var buildingArr = building.split(' ');
    var buildingObj =  _.findWhere($scope.buildings, {Abbreviation: buildingArr[1]});
    if(buildingObj){
        buildingArr = [buildingArr[0],buildingObj.Name];
    }
    return buildingArr;

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


  $scope.downloadICS = function(instructorInput){
    var arrayLen = $scope.classListSchedule.length;
    var iCal ='BEGIN:VCALENDAR\n' +
    'VERSION:2.0\n' +
    'PRODID:-//CLASS//CALENDAR//GENERATOR//UMICH//EDU\n';
    _.each($scope.classListSchedule, function(course, i){
      var time = course.Meeting.Times.split(' - ');
      var timeStart = moment(time[0], 'HHA').format('k0000');
      var timeEnd = moment(time[1], 'HHA').format('k0000');
      var courseTopic = course.ClassTopic?course.ClassTopic:'';
      var daysKeys = ['Mo','Tu', 'We', 'Th', 'Fr'];
      var days = [];
      _.each(daysKeys, function(key){
        if (course.Meeting.Days.includes(key)){
          days.push(key.toUpperCase());
        }
      });

      iCal = iCal +
      'BEGIN:VEVENT\n' +
      'SUMMARY:' + $scope.instructorInput + ' - ' + course.SubjectCode + ' ' + course.CatalogNumber + ' ' + course.SectionNumber + '\n' +
      'TZID:US-Eastern\n' +
      'DTSTART:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeStart + '\n' +
      'DTEND:' + moment(course.Meeting.StartDate, 'MM/DD/YYYY').format('YYYYMMDDT') + timeEnd + '\n' +
      'DTSTAMP:' + moment().format('YYYYMMDDT000000') + 'Z\n' +
      'RRULE:FREQ=WEEKLY;UNTIL=' + moment(course.Meeting.EndDate, 'MM/DD/YYYY').format('YYYYMMDDT000000') + 'Z;BYDAY=' + days.join() + '\n' +
      'UID:' + moment().format('x') + '-' + $scope.instructorInput + '@class-calendar-generator.umich.edu\n' +
      'DESCRIPTION:' + courseTopic + ' ' + course.CourseDescr + '\n' +
      'LOCATION:' + course.Meeting.Location[0] + ' ' + course.Meeting.Location[1] + '\n' +
      'END:VEVENT\n';
      if (i + 1 === arrayLen){
        iCal = iCal + 'END:VCALENDAR';
        downloadICS(iCal);
      }
    });
  };
}]);

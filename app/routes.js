var request = require('request');
require('dotenv').config();

// will also need to get terms, maybe hard coded for now

function getToken() {
  // POST FOR A TOKEN,
  var options = {
    method: 'POST',
    url: 'https://apigw-tst.it.umich.edu/um/aa/oauth2/token',
    headers:
    {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    form:{
      grant_type: 'client_credentials',
      client_id: process.env.CLIENTID,
      client_secret: process.env.CLIENTSECRET,
      scope: 'umscheduleofclasses'
    }
  };
  request(options, function (error, response, body) {
    if (error){
      return console.error('Failed: %s', error.message);
    }
    else {
      console.log('Success: ', body);
      return body;
    }
  });
}



module.exports = function (app) {

  app.get('/api/courses/:user_id', function (req, res) {
    console.log('getting courses');
    var token = getToken();
    var options = {
      method: 'GET',
      url: 'https://apigw-tst.it.umich.edu/um/aa/Instructors/REPLACE_UNIQNAME/Terms/REPLACE_TERMCD/Classes',
      headers:  {
        accept: 'application/json',
        authorization: 'Bearer ' + token,
        'x-ibm-client-id': process.env.CLIENTID }
      };
      console.log(options);
    request(options, function (error, response, body) {
      if (error) {
        return console.error('Failed: %s', error.message);
      }
      console.log('Success: ', body);
      res.send(body);
    });
  });

  app.get('/api/course/:course_id', function (req, res) {
    var token = getToken();
    var options = {
      method: 'GET',
      url: 'https://apigw-tst.it.umich.edu/um/Curriculum/SOC/Terms/REPLACE_TERMCODE/Classes/REPLACE_CLASSNUMBER',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + token,
        'x-ibm-client-id': process.env.CLIENTID
      }
    };

    request(options, function (error, response, body) {
      if (error) return console.error('Failed: %s', error.message);
      console.log('Success: ', body);
      res.json(course);
    });
  });

  // application -------------------------------------------------------------
  app.get('*', function (req, res) {
      res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
  });
};

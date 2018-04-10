var request = require('request');
//require dotenv so that we can get
// values from the .env file (client id, client secret and api endpoint server root) onto process object
require('dotenv').config();

module.exports = function (app) {
  app.get('/api/tokens/:scope', function (req, res) {
    // request comes from front end with scope (required by ESB) as a param
    console.log('getting the token for ' + req.params.scope);
    var options = {
      method: 'POST',
      url: process.env.APISERVER  + '/um/aa/oauth2/token',
      headers:
      {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded'
      },
      form:{
        grant_type: 'client_credentials',
        // values from .env file as well as the scope param
        client_id: process.env.CLIENTID,
        client_secret: process.env.CLIENTSECRET,
        scope: req.params.scope
      }
    };

    request(options, function (error, response, body, next) {
      if (error){
        return console.error('Failed: %s', error.message);
      }
      else {
        var bodyObj = JSON.parse(body);
        app.locals[req.params.scope + '_token'] = bodyObj.access_token;
        // return 'ok' - could be anything
        res.send('ok');
      }
    });
  });

  app.get('/api/courses/:term_id/:user_id', function (req, res) {
    // get the courses for a given term, a given user id
      var options = {
        method: 'GET',
        url: process.env.APISERVER  + '/um/aa/Instructors/' + req.params.user_id + '/Terms/' + req.params.term_id + '/Classes',
        headers:  {
          accept: 'application/json',
          // token stored in app.locals object
          authorization: 'Bearer ' + app.locals.instructors_token,
          'x-ibm-client-id': process.env.CLIENTID
          }
        };
      request(options, function (error, response, body) {
        if (error | response.statusCode === 401) {
        }
        res.send({'statusCode':response.statusCode, 'body':body});
      });
  });
  app.get('/api/terms', function (req, res) {
    //get the terms
      var options = {
        method: 'GET',
        url: process.env.APISERVER  + '/um/Curriculum/SOC/Terms',
        headers:  {
          accept: 'application/json',
          authorization: 'Bearer ' + app.locals.umscheduleofclasses_token,
          'x-ibm-client-id': process.env.CLIENTID
          }
        };
      request(options, function (error, response, body) {
        if (error | response.statusCode === 401) {
        }
        res.send(JSON.parse(body));
      });
  });

  app.get('/data/location/buildings.json', function (req, res) {
    //get the buildings.json file
    res.sendFile(__dirname + '/public/js/data/location/buildings.json');
  });

  app.get('/api/course/:term_id/:course_id', function (req, res) {
    // get the course details for a given term, a given course id
    var options = {
      method: 'GET',
      url: process.env.APISERVER  + '/um/Curriculum/SOC/Terms/' + req.params.term_id + '/Classes/' + req.params.course_id,
      headers: {
        accept: 'application/json',
        authorization: 'Bearer '  + app.locals.umscheduleofclasses_token,
        'x-ibm-client-id': process.env.CLIENTID
      }
    };

    request(options, function (error, response, body) {
      if (error) return console.error('Failed: %s', error.message);
      res.send(body);
    });
  });

  app.get('/', function (req, res) {
    // load main.html when the route is '/'
    res.sendFile(__dirname + '/public/main.html');
  });
};

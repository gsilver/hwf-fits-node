var request = require('request');
require('dotenv').config();

module.exports = function (app) {

  app.get('/api/tokens/:scope', function (req, res) {
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
      }
    });
  });

  app.get('/api/courses/:term_id/:user_id', function (req, res) {
      var options = {
        method: 'GET',
        url: 'https://apigw-tst.it.umich.edu/um/aa/Instructors/' + req.params.user_id + '/Terms/' + req.params.term_id + '/Classes',
        headers:  {
          accept: 'application/json',
          authorization: 'Bearer ' + app.locals.instructors_token,
          'x-ibm-client-id': process.env.CLIENTID
          }
        };
      request(options, function (error, response, body) {
        if (error | response.statusCode === 401) {
        }
        res.send(response);
      });
  });


  app.get('/data/location/buildings.json', function (req, res) {
    res.sendFile(__dirname + '/public/js/data/location/buildings.json');
  });

  app.get('/api/course/:term_id/:course_id', function (req, res) {
    //var token = getToken();
    var options = {
      method: 'GET',
      url: 'https://apigw-tst.it.umich.edu/um/Curriculum/SOC/Terms/' + req.params.term_id + '/Classes/' + req.params.course_id,
      headers: {
        accept: 'application/json',
        authorization: 'Bearer '  + app.locals.umscheduleofclasses_token,
        'x-ibm-client-id': process.env.CLIENTID
      }
    };

    request(options, function (error, response, body) {
      if (error) return console.error('Failed: %s', error.message);
      res.send(response);
    });
  });

  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/main.html');
  });

};

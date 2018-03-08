var request = require('request');
require('dotenv').config();

// will also need to get terms, maybe hard coded for now
token ='';

function getToken(scope) {
  //return new Promise((resolve, reject) => {
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
      scope: scope
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

  app.get('/api/courses/:term_id/:user_id', function (req, res) {
      //var token = getToken('umscheduleofclasses');
      var options = {
        method: 'GET',
        url: 'https://apigw-tst.it.umich.edu/um/aa/Instructors/' + req.params.user_id + '/Terms/' + req.params.term_id + '/Classes',
        headers:  {
          accept: 'application/json',
          authorization: 'Bearer ' + '',
          'x-ibm-client-id': process.env.CLIENTID
          }
        };
      console.log(options);
      request(options, function (error, response, body) {
        if (error | response.statusCode === 401) {
          // token has expired
          return console.error('Failed: %s', response.statusCode + ', ' + response.body);
        }
        console.log(response);
        res.send(response);
      });
  });

  app.get('/api/course/:term_id/:course_id', function (req, res) {
    //var token = getToken();
    var options = {
      method: 'GET',
      url: 'https://apigw-tst.it.umich.edu/um/Curriculum/SOC/Terms/' + req.params.term_id + '/Classes/' + req.params.course_id,
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + '',
        'x-ibm-client-id': process.env.CLIENTID
      }
    };

    request(options, function (error, response, body) {
      if (error) return console.error('Failed: %s', error.message);
      console.log('Success: ', body);
      res.send(response);
    });
  });

  // application -------------------------------------------------------------
  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/main.html'); // load the single view file (angular will handle the page changes on the front-end)
  });

  // app.get('*', function (req, res) {
  //   console.log('def route');
  //     res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
  // });
};

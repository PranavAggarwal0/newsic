var express = require('express');
var app = express();
app.use(express.json());
var path = require("path");
var http = require('http').createServer(app);
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var client_id = '3a6f0212c6124220975147d209cec029';
var client_secret = '';
var redirect_uri = 'http://localhost:8888/callback';
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
var stateKey = 'spotify_auth_state';
app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());
var session = require('express-session');
var MemoryStore = session.MemoryStore;
var sessionStore = new MemoryStore();
var sessionMiddleware = session({
    store: sessionStore,
    secret: 'secret',
    key: 'express.sid',
    saveUninitialized: true,
    resave: false
});

app.use(express.static(path.join(__dirname, "views")));
app.set('view engine', 'ejs');
app.use(sessionMiddleware);
app.use(express.urlencoded({extended: true}));

app.get('/', function(req, res) {
    res.render('index.ejs', {});
});

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  var scope = 'user-read-private user-read-email user-follow-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
})
app.get('/callback', function(req, res) {

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        request.get(options, function(error, response, body) {
          console.log(body);
          console.log(access_token);
        });


        var options = {
          url: 'https://api.spotify.com/v1/me/following?type=artist&limit=50',
          headers: {
            "Authorization": "Bearer" + access_token,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
        }

        request.get(options, function(error, response, body) {
          res.redirect('/authd', );
        });


      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});
app.get('/authd', function(req,res) {
  res.render('aut');
});
console.log('listening on port 8888');
app.listen(8888);

const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('9c222310af424fbe93d368f861519e5c');
const readline = require('readline');
const fs = require('fs');
var artistlim = 5;
var express = require('express');
var app = express();
var path = require("path");
var http = require('http').createServer(app);
var util = require('util');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var client_id = '3a6f0212c6124220975147d209cec029';
var client_secret = '329f5a93a8144fc197fb1cf5334d1bb7';
var mode = require("./config.json").mode;
var redirect_uri = mode === 'development' ? 'http://localhost:5000/callback' : 'http://news-ic.herokuapp.com/callback';
var stateKey = 'spotify_auth_state';
var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
app.use(express.static(path.join(__dirname, "views")));
app.set('view engine', 'ejs');
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
app.use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser());

app.get('/', function (req, res) {
  res.render('index', {});
});

app.get('/oops', function (req, res) {
  res.render('oops', {});
});

app.get('/about', function (req, res) {
  res.render('about', {});
});

app.get('/login', function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  var scope = 'user-read-private user-read-email user-follow-read user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
})

app.get('/callback', function (req, res) {

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  }
  else {
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

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me/top/artists?limit=' + artistlim.toString(),
          headers: {
            'Authorization': 'Bearer ' + access_token
          },
          json: true
        };

        request.get(options, function (error, response, body) {
          if(util.inspect(body.items, {
            showHidden: false,
            depth: null
          })=='[]') {
            res.render('oops');
            return;
          }
          fs.writeFile('/artistsfollowed.txt', util.inspect(body.items, {
            showHidden: false,
            depth: null
          }), function (err) {
            if (err) throw err;
          });
          var spawn = require("child_process").spawn;
          var process = spawn('python3', ["./clean_artists.py", ]);
          process.stdout.on('end', function () {
            try {
              var data = fs.readFileSync('/tosearch.txt', 'UTF-8');
              var lines = data.split(/\r?\n/);
              var display = '';
              var count = 0;
              lines.forEach((line) => {
                count++;
              });
              lines.forEach((line) => {
                newsapi.v2.everything({
                  qInTitle: line,
                  language: 'en'
                }).then(response => {
                  count--;
                  display += util.inspect(response, {
                    showHidden: false,
                    depth: null
                  });
                  if (count == 1) {
                    fs.writeFile('/links.txt', display, function (err) {
                      if (err) throw err;
                    });

                    var spawn = require('child_process').spawn,
                      py = spawn('python', ['clean_links.py']);

                    py.stdout.on('end', function () {

                      try {
                        var toshow = '';
                        var data = fs.readFileSync('/links_cleaned.txt', 'UTF-8');
                        var lines = data.split(/\r?\n/);
                        lines.forEach((line) => {
                          toshow += line + '\n\n';
                        });
                      }
                      catch (err) {
                        console.error(err);
                      }
                      res.render('links', {
                        toshow: toshow
                      });
                      fs.unlink('/artistsfollowed.txt', (err) => {
                        if (err) {
                          console.error(err)
                          return
                        }
                      })
                      fs.unlink('/links_cleaned.txt', (err) => {
                        if (err) {
                          console.error(err)
                          return
                        }
                      })
                      fs.unlink('/links.txt', (err) => {
                        if (err) {
                          console.error(err)
                          return
                        }
                      })
                      fs.unlink('/tosearch.txt', (err) => {
                        if (err) {
                          console.error(err)
                          return
                        }
                      })
                    });
                  }
                });
              });
            }
            catch (err) {
              console.error(err);
            }
          });
        });
      }
      else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


console.log('listening on port 5000');
app.listen(process.env.PORT || 5000);

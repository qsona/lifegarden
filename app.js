
/**
 * Module dependencies.
 */

var express = require('express.io');
var path = require('path');

var app = express().http().io();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({ secret: 'secret' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var _ = require('underscore');

app.get('/', function(req, res) {
  res.render('index');
});

var COLOR_CODES = ['#0000FF', '#00FF00', '#FF0000', '#00FFFF', '#FFFF00', '#FFFFFF'];
var colornum  = 0;
app.get('/garden', function(req, res) {
  if (!req.query.name) {
    return res.send('400', '名前いれてね');
  }
  req.session.user = {};
  req.session.user.name = req.query.name;
  req.session.user.color = COLOR_CODES[colornum % COLOR_CODES.length];
  colornum++;

  res.render('garden');
});

var usermap = {};

app.io.route('ready', function(req) {
  if (!req.session.user) {
    return;
  }
  usermap[req.sessionID] = req.session.user;
  req.io.emit('players', _.values(usermap));
});

app.io.route('disconnect', function(req) {
  delete usermap[req.sessionID];
});

// マスタデータ
var plants = {
  '1': [
    { letter: '、', time:  5 },
    { letter: '。', time:  7 },
    { letter: '…', time: 10 },
    { letter: 'Å', time: 30 },
  ],
  '2': [
    { letter: '木', time:  5 },
    { letter: '林', time: 10 },
    { letter: '鬱', time: 20 },
  ],
  '3': [
    { letter: 'ه', time:  8 },
    { letter: 'ت', time:  8 },
    { letter: 'ش', time: 20 },
  ],
};

// フィールドデータ
var SIZE_X = 9;
var SIZE_Y = 9;
var fields = [];
for (var i = 0; i < SIZE_X; i++) {
  fields[i] = [];
  for (var j = 0; j < SIZE_Y; j++) {
    fields[i][j] = { type: 0, evo: 0, user: { color: '#000000' }, rest: -1, letter: '＿' };
  }
}

setInterval(function() {
  for (var i = 0; i < SIZE_X; i++) {
    for (var j = 0; j < SIZE_Y; j++) {
      var field = fields[i][j];
      if (field.type === 0) continue;
      if (--field.rest <= 0) {
        if (++field.evo >= plants[field.type].length) {
          // 終了
          fields[i][j] = { type: 0, evo: 0, user: { color: '#000000' }, rest: -1, letter: '＿' };
        } else {
          field.letter = plants[field.type][field.evo].letter;
          field.rest = plants[field.type][field.evo].time;
        }
      }
    }
  }
  app.io.broadcast('fields', fields);
}, 1000);

app.io.route('number pressed', function(req) {
  if (!req.session.user) {
    return;
  }
  var num = req.data;
  var valid = num === (num | 0) && 1 <= num && num <= 3/*9*/;
  if (!valid) {
    console.log('not valid data:', num);
    return;
  }
  var x = (Math.random() * SIZE_X) | 0;
  var y = (Math.random() * SIZE_Y) | 0;

  fields[x][y] = { type: num, evo: 0, user: req.session.user, rest: plants[num][0].time, letter: plants[num][0].letter };
});

app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



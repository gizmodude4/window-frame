const express = require('express'),
    fs = require('fs'),
    isPi = require('detect-rpi'),
    isvalid = require('isvalid'),
    WebSocket = require('ws');

var Gpio, scene, song, effect;

var args = require('minimist')(process.argv.slice(2));

if (!args['config']) {
    throw new Error('Must provide config file');
}

var configFile = JSON.parse(fs.readFileSync(args['config'], 'utf8'));
var config;

isvalid(configFile, {
    'switchType': {type: String, required: false},
    'scenes': {type: Array, len: '1-', schema: {
        'endTime': {type: String, required: false},
        'songs': {type: Array, required: true, schema: {
            'link': {type: String, required: true},
            'volume': {type: Number, required: false},
            'fadeDuration': {type: Number, required: false},
            'audioEffects': {type: Array, required: false, schema: {
                'effectType': {type: String, required: true},
                'config': {type: Object, required: true, unknownKeys: 'allow'}
            }}
        }},
        'atmosphere': {type: Array, required: true, schema: {
            'image': {type: String, required: true},
            'audio': {type: Array, required: false, schema: {
                'link': {type: String, required: true},
                'volume': {type: Number, required: false},
                'loop': {type: Boolean, required: false},
                'audioEffects': {type: Array, required: false, schema: {
                    'effectType': {type: String, required: true},
                    'config': {type: Object, required: true, unknownKeys: 'allow'}
                }}
            }}
        }}
    }}
}, function(err, validData){
    if (err) {
        throw new Error('Error parsing config: ' + err);
    }
    config = validData;
});

// Set up interrupts
if (isPi()) {
    Gpio = require('onoff').Gpio;
    scene = new Gpio(4, 'in', 'rising', {debounceTimeout: 10});
    song = new Gpio(5, 'in', 'rising', {debounceTimeout: 10});
    effect = new Gpio(6, 'in', 'rising', {debounceTimeout: 10});
}

// Set up express app
var app = express();

app.get('/scenes', function(req, res) {
	res.header('Access-Control-Allow-Origin', '*');
    res.send(config);
});

app.listen(8080);

const wss = new WebSocket.Server({ port: 9090});
wss.on('connection', setUpInterrupts);
wss.on('close', clearInterrupts);

process.on('SIGINT', () => {
  if (isPi()){
    scene.unexport();
    song.unexport();
    effect.unexport();
  }
});

function setUpInterrupts() {
    if (isPi()) {
        scene.watch((err, value) => {
            if (err) {
                throw err;
            }
            ws.send('switch_scene');
        });
        
        song.watch((err, value) => {
            if (err) {
                throw err;
            }
            ws.send('switch_song');
        });
        
        effect.watch((err, value) => {
            if (err) {
                throw err;
            }
            ws.send('switch_effect');
        });
    }
}

function clearInterrupts() {
    if (isPi()) {
        scene.unwatch();        
        song.unwatch(); 
        effect.unwatch(); 
    }
}

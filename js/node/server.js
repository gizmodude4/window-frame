const express = require('express'),
    fs = require('fs'),
    Gpio = require('onoff').Gpio;
    isvalid = require('isvalid'),
    WebSocket = require('ws');

var args = require('minimist')(process.argv.slice(2));

if (!args['config']) {
    throw new Error("Must provide config file");
}

var configFile = JSON.parse(fs.readFileSync(args['config'], 'utf8'));
var config;

isvalid(configFile, {
    "scenes": {"type": Array, len: "1-", schema: {
        "image": {"type": String, required: true},
        "songs": {"type": Array, required: true, schema: {
            "link": {"type": String, required: true},
            "volume": {"type": Number, required: false},
            "fadeDuration": {"type": Number, required: false}
        }},
        "effects": {"type": Array, required: false, schema: {
            "link": {"type": String, required: true},
            "volume": {"type": Number, required: false},
            "fadeDuration": {"type": Number, required: false}
        }}
    }}
}, function(err, validData){
    if (err) {
        throw new Error("Error parsing config: " + err);
    }
    config = validData;
});

// Set up push buttons
const scene = new Gpio(4, 'in', 'rising', {debounceTimeout: 10});
const song = new Gpio(5, 'in', 'rising', {debounceTimeout: 10});
const effect = new Gpio(6, 'in', 'rising', {debounceTimeout: 10});

// Set up express app
var app = express();

app.get('/scenes', function(req, res) {
    res.send(config);
});

app.listen(8080);

const wss = new WebSocket.Server({ port: 9090});
wss.on('connection', function connection(ws) {
    scene.watch((err, value) => {
		if (err) {
			throw err;
		}
		console.log("pushed scene button");
 
		ws.send("switch_scene");
	});
	
	song.watch((err, value) => {
		if (err) {
			throw err;
		}
		console.log("pushed song button");
 
		ws.send("switch_song");
	});
	
	effect.watch((err, value) => {
		if (err) {
			throw err;
		}
		console.log("pushed effect button");
 
		ws.send("switch_effect");
	});
});

process.on('SIGINT', () => {
  scene.unexport();
  song.unexport();
  effect.unexport();
});

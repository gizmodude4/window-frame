const express = require('express'),
    fs = require('fs'),
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

// TODO: remove when button pressing stuff is in
var stdin = process.stdin;

// without this, we would only get streams once enter is pressed
stdin.setRawMode( true );

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();

// i don't want binary, do you?
stdin.setEncoding( 'utf8' );

// Set up express app
var app = express();

app.get('/scenes', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.send(config);
})

app.listen(8080);

const wss = new WebSocket.Server({ port: 9090});
wss.on('connection', function connection(ws) {
    // TODO: remove this debug code
    stdin.on( 'data', function( key ){
        console.log(key);
        if (key === 'e') {
            ws.send("switch_effect");
        } else if (key === 's') {
            ws.send("switch_song");
        } else if (key === 'f') {
            ws.send("switch_scene");
        }
      });
    ws.on('message', function incoming(message){
        console.log('Received ' + message);
    });
});
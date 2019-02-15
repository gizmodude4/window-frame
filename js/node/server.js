const cors = require('cors'),
    express = require('express'),
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

// Set up express app
var app = express();

app.get('/config', function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.send(config);
})

app.listen(8080);

const wss = new WebSocket.Server({ port: 9090});
wss.on('connection', function connection(ws) {
    // TODO: remove this debug code
    var debugInterval = setInterval(function() {
        ws.send("switch_effect");
    }, 4000);
    ws.on('message', function incoming(message){
        console.log('Received ' + message);
    });
    ws.on('close', function clear() {
        clearInterval(debugInterval);
    });
});
const express = require('express'),
    enableWs = require('express-ws')
    fs = require('fs'),
    isvalid = require('isvalid'),
    Parser = require('icecast-parser');

var configPath;
var args = require('minimist')(process.argv.slice(2));

if (args['config']) {
    configPath = args['config'];
}

if (process.env.CONFIG) {
    if (configPath) {
        console.log("Environment variable overridden by command line config");
    } else {
        configPath = process.env.CONFIG;
    }
}

if (!configPath) {
    throw new Error('Must provide config file either with environment variable or command line argument');
}

var configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
var config;

isvalid(configFile, {
    'switchType': {type: String, required: false},
    'scenes': {type: Array, len: '1-', schema: {
        'id': {type: String, required: true},
        'endTime': {type: String, required: false},
        'audioEffects': {type: Array, required: false, schema: {
            'effectType': {type: String, required: true},
            'config': {type: Object, required: true, unknownKeys: 'allow'}
        }},
        'stream': {type: String, required: true},
        'atmosphere': {type: Array, required: true, schema: {
            'name': {type: String, required: false},
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
        throw new Error('Error parsing config: ' + err.stack());
    }
    config = validData;
    setUpServer(config);
});

var socketConnections = {};
var streamParsers = [];
function setUpServer() {
    // Websocket
    config.scenes.forEach(function(scene){
        socketConnections[scene.id] = [];
        var parser = new Parser(scene.stream);
        parser.on('metadata', function(metadata) {
            sendMetadata(scene.id, metadata);
        });
        streamParsers.push(parser);
    });

    function sendMetadata(streamId, metadata) {
        if (socketConnections[streamId]) {
            socketConnections[streamId].forEach(function(ws) {
                ws.send(metadata)
            })
        }
    }

    // Set up express app
    var app = express();
    enableWs(app);

    app.get('/scenes', function(req, res) {
        res.header('Access-Control-Allow-Origin', '*');
        res.send(config);
    });

    app.ws('/scenes/:sceneId/updates/subscribe', function(ws, req) {
        addToListeners(sceneId, ws);
        ws.on('close', function() {
            removeFromListeners(sceneId, ws);
        })
    });

    app.listen(8080);
}

function addToListeners(sceneId, ws) {
    socketConnections[sceneId].push(ws);
}

function removeFromListeners(sceneId, ws) {
    var conns = socketConnections[sceneId];
    for (var i = 0; i < conns.length; i++) {
        if (ws == cons[i]) {
            socketConnections[sceneId].splice(i,1);
            return;
        }
    }
}

const express = require('express'),
    enableWs = require('express-ws'),
    fs = require('fs'),
    http = require('http'),
    isvalid = require('isvalid'),
    Parser = require('icecast-parser'),
    request = require('request');

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

var app = express();
enableWs(app);
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
        'admin': {type: String, required: true},
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
var curStreamMeta = {};
function setUpServer() {
    // Websocket
    config.scenes.forEach(function(scene){
        socketConnections[scene.id] = {};
        curStreamMeta[scene.id] = undefined;
        provisionIcecastParser(scene.stream, scene.id);
    });

    // Set up express app
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "http://localhost:8000"); // update to match the domain you will make the request from
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods", "GET, PUT");
        next();
    });
    
    app.get('/scenes', function(req, res) {
        res.send(config);
    });

    app.ws('/scenes/updates', function(ws, req) {
        var origin = req.header('Origin');
        ws.on('close', function() {
            removeFromListeners(origin);
        });
        ws.on('message', function(message) {
            addToListeners(message, origin, ws);
            if (Object.keys(curStreamMeta).includes(message) && curStreamMeta[message]) {
                ws.send(curStreamMeta[message]);
            }
        });
    });

    app.put('/scenes/:sceneId/skip', function(req, res) {
        var sceneId = req.params.sceneId;
        var foundSeen = undefined;
        config['scenes'].forEach(function(scene) {
            if (scene.id = sceneId) {
                foundSeen = scene;
            }
        })
        if (!foundSeen) {
            res.status(404).send("No scene with ID " + sceneId + " found");
        } else {
            var adminUrl = foundSeen.admin;
            request.put(adminUrl + "/skip")
                .on('response', function(response) {
                    res.sendStatus(response.statusCode);
                });
        }
    });
    app.listen(8080);
}

function provisionIcecastParser(streamUrl, sceneId) {
    var parser = new Parser( {
        url: streamUrl,
        emptyInterval: 60,
        errorInterval: 60,
        metadataInterval: 1
    });
    parser.on('metadata', function(metadata) {
        if (curStreamMeta[sceneId] != metadata.StreamTitle) {
            curStreamMeta[sceneId] = metadata.StreamTitle;
            sendMetadata(sceneId, metadata.StreamTitle);
        }
    });
    parser.on('error', function() {
        console.error('An error happened connecting to ' + streamUrl + ' will try again soon...')
    })
}

function sendMetadata(streamId, metadata) {
    if (socketConnections[streamId]) {
        for (origin in socketConnections[streamId]) {
            socketConnections[streamId][origin].send(metadata);
        }
    }
}

function addToListeners(sceneId, origin, ws) {
    if (!Object.keys(curStreamMeta).includes(sceneId)) {
        console.error('Could not find stream associated with stream ID ' + sceneId);
    } else {
        socketConnections[sceneId][origin] = ws;
    }
    
}

function removeFromListeners(origin) {
    for (scene in socketConnections) {
        if (Object.keys(socketConnections[scene]).includes(origin)) {
            delete socketConnections[scene][origin];
        }
    }
}

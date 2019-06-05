const express = require('express'),
    fs = require('fs'),
    isPi = require('detect-rpi'),
    isvalid = require('isvalid'),
    WebSocket = require('ws'),
    WindowFrame = require('./classes/WindowFrame.js'),
    SceneAudio = require('./classes/SceneAudio.js'),
    Scene  = require('./classes/Scene.js'),
    Atmosphere = require('./classes/Atmosphere.js'),
    AudioEffect = require('./classes/AudioEffect.js'),
    AudioContext = require('web-audio-api').AudioContext;

var Gpio, scene, song, effect;

var args = require('minimist')(process.argv.slice(2));

if (!args['config']) {
    throw new Error('Must provide config file');
}

var configFile = JSON.parse(fs.readFileSync(args['config'], 'utf8'));
var outputContext = new AudioContext();

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
    // Set up the scenes, etc.
    var scenes = parseScenes(validData);
    windowFrame = new WindowFrame(scenes, validData['switchType'], outputContext);
    windowFrame.showScene(scenes[0]);
    var socket = new WebSocket('ws://localhost:9090');
    socket.onmessage = handleAction;
});

// Set up interrupts
if (isPi()) {
    Gpio = require('onoff').Gpio;
    scene = new Gpio(4, 'in', 'rising', {debounceTimeout: 10});
    song = new Gpio(5, 'in', 'rising', {debounceTimeout: 10});
    effect = new Gpio(6, 'in', 'rising', {debounceTimeout: 10});
}

/*
* TODO: add API calls to switch tracks and stuff
* GET /currentImage returns current scene
* STREAM /audio whatever radio thing is happening
* POST /actions/nextSong returns 204
* POST /actions/toggleAtmosphere return 204
* POST /actions/nextScene switches scenes and returns image to display and stream url
*/
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

function setUpInterrupts(ws) {
    if (isPi()) {
        scene.watch((err, value) => {
            // TODO: switch scenes here
            if (err) {
                throw err;
            }
            ws.send('switch_scene');
        });
        
        song.watch((err, value) => {
            // TODO: switch songs here
            if (err) {
                throw err;
            }
            ws.send('switch_song');
        });
        
        effect.watch((err, value) => {
            // TODO: toggle effects here
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

var windowFrame;

function parseScenes(sceneConfigs) {
    var scenes = [];
    sceneConfigs['scenes'].forEach(function(sceneConfig) {
        var songs = [];
        var atmosphere = [];
        sceneConfig['songs'].forEach(function(songConfig){
            songs.push(toSceneAudio(songConfig))
        });

        sceneConfig['atmosphere'].forEach(function(atmosphereConfig) {
            var atmosphereAudio = [];
            if (atmosphereConfig['audio'] && atmosphereConfig['audio'].length > 0) {
                atmosphereConfig['audio'].forEach(audioConfig => {
                    atmosphereAudio.push(toSceneAudio(audioConfig));
                })
            }
            atmosphere.push(new Atmosphere(atmosphereConfig['image'], atmosphereAudio))
        });
        scenes.push(new Scene(songs, atmosphere, sceneConfig['endTime']));
    });
    return scenes;
}

function toSceneAudio(audioConfig) {
    var audioEffects = [];
    if (audioConfig['audioEffects'] && audioConfig['audioEffects'].length > 0) {
        audioConfig['audioEffects'].forEach(effectConfig => {
            audioEffects.push(new AudioEffect(effectConfig['effectType'], effectConfig['config']));
        });
    }
    return new SceneAudio(audioConfig['link'],
        audioConfig['volume'],
        audioConfig['fadeDuration'],
        audioConfig['loop'],
        audioEffects);
}

function handleAction(event) {
    var action = undefined;
    if (event.key) {
        action = keyToAction(event.key);
    } else if (event.data) {
        action = event.data;
    }
    if (!windowFrame.getProcessing()) {
        windowFrame.setProcessing();
        switch(action) {
            case 'switch_effect':
                windowFrame.playNextAtmosphere(() => { windowFrame.clearProcessing(); });
                break;
            case 'switch_song':
                windowFrame.playNextSong(() => { windowFrame.clearProcessing(); });
                break;
            case 'switch_scene':
                windowFrame.showNextScene(() => { windowFrame.clearProcessing(); });
                break;    
            default:
                console.log('Unknown socket message type: ' + action);
                break;
        }
    } else {
        console.log('Received action ' + action + ' during processing. Ignoring...');
    }
}
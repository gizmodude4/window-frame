'use strict';

import WindowFrame from './WindowFrame.js';
import SceneAudio from './SceneAudio.js';
import Scene from './Scene.js';
import Atmosphere from './Atmosphere.js';
import AudioEffect from './AudioEffect.js';
import AudioEffectCreator from './AudioEffectCreator.js';
import AudioManager from './AudioManager.js';

var image = document.getElementById('background');
var stream = document.getElementById('player');
var sceneDisplay = document.getElementById('sceneDisplay');
var songDisplay = document.getElementById('songDisplay');
var isChromium = window.chrome ? true : false;
var streamError = 0;
var currTime = -1;

stream.addEventListener('error', () => {
    streamError++;
    console.error('Audio stream error, reloading...');
    if (streamError < 5) {
        stream.load();
    }
});

setInterval(() => {
    var newTime = stream.currentTime;
    if (currTime == -1) {
        currTime = newTime;
    } else if (currTime == newTime) {
        console.error('Audio stream not plaing, reloading...');
        stream.load();
    }
}, 10000);

var windowFrame;

function getScenesListener() {
    var returnConfig = JSON.parse(this.responseText)
    var scenes = parseScenes(returnConfig);
    var atmosphereAudioManager = new AudioManager(AudioEffectCreator);
    windowFrame = new WindowFrame(scenes, returnConfig['switchType'], image, sceneDisplay,
                                  songDisplay, stream, atmosphereAudioManager, sendSocketMessage,
                                  displayMessage, isChromium);
    windowFrame.showScene(scenes[0]);
}

function parseScenes(sceneConfigs) {
    var scenes = [];
    sceneConfigs['scenes'].forEach(function(sceneConfig) {
        var atmosphere = [];
        var songAudioEffects = toAudioEffects(sceneConfig['audioEffects']);
        sceneConfig['atmosphere'].forEach(function(atmosphereConfig) {
            var atmosphereAudio = [];
            if (atmosphereConfig['audio'] && atmosphereConfig['audio'].length > 0) {
                atmosphereConfig['audio'].forEach(audioConfig => {
                    atmosphereAudio.push(toSceneAudio(audioConfig));
                })
            }
            atmosphere.push(new Atmosphere(atmosphereConfig['image'], atmosphereConfig['name'], atmosphereAudio))
        });
        scenes.push(new Scene(sceneConfig['id'], sceneConfig['stream'], sceneConfig['streamVolume'], songAudioEffects, atmosphere, sceneConfig['endTime']));
    });
    return scenes;
}

function toAudioEffects(audioEffectConfig) {
    var audioEffects = [];
    if (audioEffectConfig && audioEffectConfig.length > 0) {
        audioEffectConfig.forEach(effectConfig => {
            audioEffects.push(AudioEffectCreator.createEffect(new AudioEffect(effectConfig['effectType'], effectConfig['config'])));
        });
    }
    return audioEffects;
}

function toSceneAudio(audioConfig) {
    return new SceneAudio(audioConfig['link'],
        audioConfig['volume'],
        audioConfig['fadeDuration'],
        audioConfig['loop'],
        toAudioEffects(audioConfig['audioEffects']));
}

function receiveMetadata(metadata) {
    displayMessage(songDisplay, metadata.data);
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

function displayMessage(tag, text) {
    if (text) {
        tag.textContent = text;
        tag.style.opacity = 1;
        setTimeout(() => {
            var fadeOut = setInterval(() => {
                tag.style.opacity = tag.style.opacity - 0.01;
                if (tag.style.opacity <= 0) {
                    clearInterval(fadeOut);
                }
            }, 10);
        }, 5000);
    }
}

var oReq = new XMLHttpRequest();
oReq.addEventListener('load', getScenesListener);
oReq.open('GET', 'http://localhost:8080/scenes');
oReq.send();

var socket = new WebSocket('ws://localhost:8080/scenes/updates');
socket.onmessage = receiveMetadata;

function sendSocketMessage(message) {
    var retry = setInterval(function() {
        if (socket.readyState == WebSocket.OPEN) {
            socket.send(message);
            clearInterval(retry);
        }
    }, 1000);
}

function keyToAction(key) {
    switch(key) {
        case 's':
            return 'switch_scene';
        case 'e':
            return 'switch_effect';
        case 'm':
            return 'switch_song';
        default:
            return undefined;
    }
}

document.addEventListener('keypress', handleAction);

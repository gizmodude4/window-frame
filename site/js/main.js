import WindowFrame from './WindowFrame.js';
import SceneAudio from './SceneAudio.js';
import Scene from './Scene.js';
import Atmosphere from './Atmosphere.js';
import AudioEffect from './AudioEffect.js';
import AudioManager from './AudioManager.js';

var image = document.getElementById('background');
var sceneDisplay = document.getElementById('sceneDisplay');
var songDisplay = document.getElementById('songDisplay');

var windowFrame;

function getScenesListener() {
    var returnConfig = JSON.parse(this.responseText)
    var scenes = parseScenes(returnConfig);
    var songAudioManager = new AudioManager();
    var atmosphereAudioManager = new AudioManager();
    windowFrame = new WindowFrame(scenes, returnConfig['switchType'], image, sceneDisplay, songDisplay, songAudioManager, atmosphereAudioManager);
    windowFrame.showScene(scenes[0]);
    var socket = new WebSocket('ws://localhost:9090');
    socket.onmessage = handleAction;
}

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
            atmosphere.push(new Atmosphere(atmosphereConfig['image'], atmosphereConfig['name'], atmosphereAudio))
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

var oReq = new XMLHttpRequest();
oReq.addEventListener('load', getScenesListener);
oReq.open('GET', 'http://localhost:8080/scenes');
oReq.send();

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
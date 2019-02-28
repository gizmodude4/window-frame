import WindowFrame from "./WindowFrame.js";
import SceneAudio from "./SceneAudio.js";
import Scene from "./Scene.js";
import Atmosphere from "./Atmosphere.js";
import AudioEffect from "./AudioEffect.js";
import AudioManager from "./AudioManager.js";

var display = document.getElementById("background");

var processingEvent = false;
var processingEventWatchdog = null;

var windowFrame;

function getScenesListener() {
    var scenes = parseScenes(JSON.parse(this.responseText));
    var songAudioManager = new AudioManager();
    var atmosphereAudioManager = new AudioManager();
    windowFrame = new WindowFrame(scenes, display, songAudioManager, atmosphereAudioManager);
    windowFrame.showScene(0);
    var socket = new WebSocket("ws://localhost:9090");
    socket.onmessage = handleSocketMessage;
}

function parseScenes(sceneConfigs) {
    var scenes = [];
    sceneConfigs["scenes"].forEach(function(sceneConfig) {
        var songs = [];
        var atmosphere = [];
        sceneConfig["songs"].forEach(function(songConfig){
            songs.push(toSceneAudio(songConfig))
        });

        sceneConfig["atmosphere"].forEach(function(atmosphereConfig) {
            var atmosphereAudio = [];
            if (atmosphereConfig['audio'] && atmosphereConfig['audio'].length > 0) {
                atmosphereConfig['audio'].forEach(audioConfig => {
                    atmosphereAudio.push(toSceneAudio(audioConfig));
                })
            }
            atmosphere.push(new Atmosphere(atmosphereConfig["image"], atmosphereAudio))
        });
        scenes.push(new Scene(songs, atmosphere));
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
    return new SceneAudio(audioConfig["link"],
        audioConfig['volume'],
        audioConfig['fadeDuration'],
        audioConfig['loop'],
        audioEffects);
}

function handleSocketMessage(event) {
    if (!processingEvent) {
        setProcessing();
        switch(event.data) {
            case "switch_effect":
                windowFrame.playNextAtmosphere(clearProcessing);
                break;
            case "switch_song":
                console.log('got switch song');
                windowFrame.playNextSong(clearProcessing);
                break;
            case "switch_scene":
                windowFrame.showNextScene(clearProcessing);
                break;    
            default:
                console.log("Unknown socket message type: " + event.data);
                break;
        }
    } else {
        console.log("blocked spammy call " + event.data);
    }
}

function clearProcessing() {
    processingEvent = false;
    if (processingEventWatchdog) {
        clearTimeout(processingEventWatchdog);
    }
}

function setProcessing() {
    processingEvent = true;
    processingEventWatchdog = setTimeout(function() {
        if (processingEvent) {
            processingEvent = false;
        }
    }, 5000);
}

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", getScenesListener);
oReq.open("GET", "http://localhost:8080/scenes");
oReq.send();
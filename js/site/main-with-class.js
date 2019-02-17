import WindowFrame from "./WindowFrame.js";
import SceneAudio from "./SceneAudio.js";
import Scene from "./Scene.js";

var music = document.getElementById("music");
var effect = document.getElementById("effect");
var display = document.getElementById("background");

var windowFrame;

music.addEventListener("ended", function() {
    windowFrame.playNextSong();
});

effect.addEventListener("ended", function() {
    effect.play();
})

function getScenesListener() {
    var scenes = parseScenes(JSON.parse(this.responseText));
    windowFrame = new WindowFrame(scenes, display, music, effect)
    windowFrame.showScene(0);
    var socket = new WebSocket("ws://localhost:9090");
    socket.onmessage = handleSocketMessage;
}

function parseScenes(sceneConfigs) {
    var scenes = [];
    sceneConfigs["scenes"].forEach(function(sceneConfig) {
        var songs = [];
        var effects = [];
        sceneConfig["songs"].forEach(function(songConfig){
            songs.push(new SceneAudio(songConfig["link"], songConfig["volume"], songConfig["fadeDuration"]))
        });

        sceneConfig["effects"].forEach(function(effectConfig){
            effects.push(new SceneAudio(effectConfig["link"], effectConfig["volume"], effectConfig["fadeDuration"]))
        });
        scenes.push(new Scene(sceneConfig["image"], songs, effects));
    });
    return scenes;
}

function handleSocketMessage(event) {
    switch(event.data) {
        case "switch_effect":
            windowFrame.playNextEffect();
            break;
        case "switch_song":
            windowFrame.playNextSong();
            break;
        case "switch_scene":
            windowFrame.showNextScene();
            break;    
        default:
            console.log("Unknown socket message type: " + event.data);
            break;
    }
}

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", getScenesListener);
oReq.open("GET", "http://localhost:8080/scenes");
oReq.send();
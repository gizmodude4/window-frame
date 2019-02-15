const DEFAULT_MUSIC_VOLUME = 50;
const DEFAULT_SOUND_EFFECT_VOLUME = 75;
var music = document.getElementById("music");
var atmosphere = document.getElementById("atmosphere");
var display = document.getElementById("background");

var config;

var sceneIndex = 0;
var songIndex = 0;
var effectIndex = undefined;

music.addEventListener("ended", function() {
    var scene = getCurrentScene();
    songIndex++;
    if (songIndex >= scene["songs"].length) {
        songIndex = 0;
    }
    var song = scene["songs"][songIndex]
    setTimeout(function() {
        playSong(songIndex);
    }, song["fadeDuration"] || 0);
});

atmosphere.addEventListener("ended", function() {
    atmosphere.play();
})

function playSong(songIndex) {
    var scene = getCurrentScene();
    var song = scene["songs"][songIndex];
    playAudio(music, song["link"], song["volume"] || DEFAULT_MUSIC_VOLUME, song["fadeDuration"] || 0);
}

function playEffect(effectIndex) {
    var scene = getCurrentScene();
    var effect = scene["effects"][effectIndex];
    playAudio(atmosphere, effect["link"], effect["volume"] || DEFAULT_SOUND_EFFECT_VOLUME, effect["fadeDuration"] || 0);
}

function stopAudio(tag) {
    tag.pause();
}

function playAudio(tag, song, volume, fadeDuration) {
    tag.src = song;
    tag.load();
    tag.onloadedmetadata = function() {
        if (tag.duration > (fadeDuration * 2)/1000) {
            tag.volume = 0.0;
            var fadeIn = setInterval(function() {
                if (tag.volume >= volume/100 - 0.01) {
                    tag.volume = volume/100;
                    clearInterval(fadeIn);
                } else {
                    tag.volume += 0.01;
                }
                
            }, fadeDuration/100);

            var fadeOut = setInterval(function() {
                if (tag.currentTime <= (tag.duration - fadeDuration)) {
                    if (tag.volume <= 0.01) {
                        clearInterval(fadeOut)
                    } else {
                        tag.volume -= 0.01;
                    }
                }
            }, fadeDuration/100);
        }
        tag.play();
    }
}

function getCurrentScene() {
    return config["scenes"][sceneIndex];
}

function setCurrentWindow() {
    var scene = getCurrentScene();
    background.style.backgroundImage = "url(" + scene["image"] + ")";
    songIndex = 0;
    playSong(songIndex);
}

function getConfigListener() {
    config = JSON.parse(this.responseText);
    var socket = new WebSocket("ws://localhost:9090");
    socket.onmessage = handleSocketMessage;
    setCurrentWindow();
}

function switchEffect() {
    var scene = getCurrentScene();
    if (scene["effects"].length > 0) {
        if (typeof effectIndex === 'undefined') {
            effectIndex = 0;
        } else {
            effectIndex++;
        }
        
        if (effectIndex >= scene["effects"].length) {
            effectIndex = undefined;
            stopAudio(atmosphere);
        } else {
            playEffect(effectIndex);
        }
    }
}

function handleSocketMessage(event) {
    switch(event.data) {
        case "switch_effect":
            switchEffect();
            break;
        default:
            console.log("Unknown socket message type: " + event.data);
            break;
    }
}

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", getConfigListener);
oReq.open("GET", "http://localhost:8080/config");
oReq.send();
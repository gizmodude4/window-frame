'use strict';

const Pizzicato = window.Pizzicato;

class WindowFrame {
    constructor(scenes, type, displayTag, sceneDisplay, songDisplay, audioStreamTag, atmosphereAudioManager, socketMessager, displayMessage) {
        this.type = type || 'playlist';
        this.audioStreamTag = audioStreamTag;
        this.audioStream = undefined;
        this.atmosphereAudioManager = atmosphereAudioManager;
        this.displayTag = displayTag;
        this.sceneDisplay = sceneDisplay;
        this.songDisplay = songDisplay;
        this.scenes = scenes;
        this.sceneIndex = 0;
        this.atmosphereIndex = 0;
        this.nextSceneTimeout = undefined;
        this.processingEvent = false;
        this.processingEventWatchdog = undefined;
        this.socketMessager = socketMessager;
        this.displayMessage = displayMessage;
    }

    playNextSong(cb) {
        var oReq = new XMLHttpRequest();
        oReq.addEventListener('load', cb);
        oReq.open('PUT', 'http://localhost:8080/scenes/' + this.scenes[this.sceneIndex].id  + '/skip');
        oReq.send();
    }

    playNextAtmosphere(cb) {
        var scene = this.scenes[this.sceneIndex];
        this.atmosphereIndex++;
        if (this.atmosphereIndex >= scene.getAtmosphereCount()) {
            this.atmosphereIndex = 0;
        }
        this.displayMessage(this.sceneDisplay, scene.getAtmosphere(this.atmosphereIndex).getName());
        this.showImage(scene.getAtmosphere(this.atmosphereIndex).getImage());
        this.playAtmosphere(scene.getAtmosphere(this.atmosphereIndex), cb);
    }

    showNextScene(cb) {
        var nextScene = undefined;
        if (this.type != 'scheduled') {
            this.sceneIndex++;
            if (this.sceneIndex >= this.scenes.length) {
                this.sceneIndex = 0;
            }
            nextScene = this.scenes[this.sceneIndex];
        } else {
            nextScene = getNextSceneInTime(this.scenes);
        }
        this.showScene(nextScene, cb);
    }

    showScene(scene, cb) {
        if (scene.getEndTime()) {
            var self = this;
            self.nextSceneTimeout = setTimeout(() => {
                var processInterval = setInterval(() => {
                    if (!self.getProcessing()) {
                        clearInterval(processInterval);
                        self.setProcessing();
                        self.showNextScene(self.clearProcessing);
                    }
                }, 1000);
            }, getTimeUntil(scene.getEndTime()));
        }
        this.atmosphereIndex = 0;
        this.switchingAudio = true;
        this.switchingAtmosphere = true;
        this.displayMessage(this.sceneDisplay, scene.getAtmosphere(0).getName());
        console.log(this.socket);
        console.log(scene.getId());
        this.socketMessager(scene.getId());
        console.log(scene.getAtmosphere(0));
        this.showImage(scene.getAtmosphere(0).getImage());
        this.playStream(scene.getStream(), scene.getSongSoundEffects(), () => {
            this.playAtmosphere(scene.getAtmosphere(0), cb); 
        });
        this.switchingAudio = false;
    }

    showImage(image) {
        this.displayTag.style.backgroundImage = 'url(' + image + ')';
    }

    playStream(streamLink, soundEffects, cb) {
        var self = this;
        this.audioStreamTag.src = streamLink;
        this.audioStreamTag.oncanplaythrough = function() {
            self.audioStream = new Pizzicato.Sound({
                'source': 'audioElement',
                'options': {
                  'audioElement': self.audioStreamTag
                }
              });
            soundEffects.forEach(function(soundEffect) {
                self.audioStream.addEffect(soundEffect);
            });
            self.audioStream.play();
            cb();
        };
    }

    playAtmosphere(atmosphere, cb) {
        this.atmosphereAudioManager.stopAllPlayingAudio();
        var promises = [];
        var self = this;
        atmosphere.getAudio().forEach(audio => {
            promises.push(new Promise((resolve) => {
                self.atmosphereAudioManager.playAudio(audio, [], null, resolve);
            }));
        });
        if (promises.length > 0) {
            Promise.all(promises).then(() => { if(cb) { cb(); } });
        } else {
            if (cb) {
                cb();
            }
        }
    }

    getProcessing() {
        return this.processingEvent;
    }

    setProcessing() {
        this.processingEvent = true;
        this.processingEventWatchdog = setTimeout(() => {
            if (this.processingEvent) {
                this.processingEvent = false;
                this.processingEventWatchdog = undefined;
            }
        }, 5000);
    }

    clearProcessing() {
        if (this.processingEventWatchdog) {
            clearTimeout(this.processingEventWatchdog);
        }
        this.processingEvent = false;
    }
}

function getNextSceneInTime(scenes) {
    var nextTimeUntil = -1;
    var nextScene = undefined;
    scenes.forEach(scene => {
        var timeUntil = getTimeUntil(scene.getEndTime());
        if (nextTimeUntil === -1 || timeUntil < nextTimeUntil) {
            nextTimeUntil = timeUntil;
            nextScene = scene;
        }
    });
    return nextScene;
}

function getTimeUntil(time) {
    var now = new Date(Date.now());
    var setTime = new Date(now.getTime());
    setTime.setHours(time.substring(0, time.indexOf(':')));
    setTime.setMinutes(time.substring(time.indexOf(':') + 1));
    setTime.setSeconds(0);
    setTime.setMilliseconds(0);
    if (setTime.getTime() < now.getTime()) {
        setTime.setTime(setTime.getTime() + 24*60*60*1000);
    }
    return setTime.getTime() - now.getTime();
}

export default WindowFrame;

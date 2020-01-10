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
        this.fadeDuration = 2000;
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
        var self = this;
        if (this.atmosphereIndex >= scene.getAtmosphereCount()) {
            this.atmosphereIndex = 0;
        }
        var atmosphere = scene.getAtmosphere(self.atmosphereIndex);
        this.fadeSceneOut(atmosphere, function() {
            self.atmosphereAudioManager.stopAllPlayingAudio();
            self.displayMessage(self.sceneDisplay, atmosphere.getName());
            self.socketMessager(scene.getId());
            self.displayTag.style.backgroundImage = 'url(' + atmosphere.getImage() + ')';
            self.playAtmosphere(atmosphere, true, function() {
                self.fadeSceneIn(scene.getStreamVolume()/100, atmosphere, cb);
            });
        });
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
        var self = this;
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
        this.fadeSceneOut(scene.getAtmosphere(self.atmosphereIndex), function() {
            self.atmosphereIndex = 0;
            self.atmosphereAudioManager.stopAllPlayingAudio();
            self.displayMessage(self.sceneDisplay, scene.getAtmosphere(0).getName());
            self.socketMessager(scene.getId());
            self.displayTag.style.backgroundImage = 'url(' + scene.getAtmosphere(0).getImage() + ')';
            self.playStream(scene.getStream(), 0, scene.getSongSoundEffects(), function() {
                self.playAtmosphere(scene.getAtmosphere(0), true, function() {
                    self.fadeSceneIn(scene.getStreamVolume()/100, scene.getAtmosphere(0), cb);
                });
            });
        });
    }

    fadeSceneOut(atmosphere, cb) {
        var self = this;
        var curOpacity = parseFloat(self.displayTag.style.opacity);
        var opacity = curOpacity ? curOpacity : 1;
        var curVolume = self.audioStream ? self.audioStream.volume : 1;
        var fadeStep = 100/self.fadeDuration;
        var imageFadeOut = setInterval(function() {
            opacity -= fadeStep;
            if (opacity <= curVolume && curVolume > 0) {
                curVolume -= fadeStep;
                curVolume = curVolume < 0 ? 0 : curVolume;
            }
            if (self.audioStream && self.audioStream.volume > curVolume) {
                self.audioStream.volume = curVolume;
            }
            atmosphere.getAudio().forEach(audio => {
                if (audio.getVolume()/100 >= curVolume) {
                    self.atmosphereAudioManager.setCurrentlyPlayingVolume(audio.getLink(), curVolume);
                }
            });
            self.displayTag.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(imageFadeOut);
                cb();
            }
        }, self.fadeDuration/100);
    }

    fadeSceneIn(streamVolume, atmosphere, cb) {
        var self = this;
        var curOpacity = parseFloat(self.displayTag.style.opacity);
        var opacity = curOpacity ? curOpacity : 0;
        var curVolume = self.audioStream ? self.audioStream.volume : 0;
        var fadeStep = 100/self.fadeDuration;
        var imageFadeIn = setInterval(function() {
            opacity += fadeStep;
            if (opacity >= curVolume) {
                curVolume += fadeStep;
                curVolume = curVolume > 1 ? 1 : curVolume;
            }
            atmosphere.getAudio().forEach(audio => {
                if (audio.getVolume()/100 >= curVolume) {
                    self.atmosphereAudioManager.setCurrentlyPlayingVolume(audio.getLink(), curVolume);
                }
            });
            if (self.audioStream && streamVolume >= curVolume) {
                self.audioStream.volume = curVolume;
            }
            self.displayTag.style.opacity = opacity;
            if (opacity >= 1) {
                clearInterval(imageFadeIn);
                if (cb) {
                    cb();
                }
            }
        }, self.fadeDuration/100);
    }

    playStream(streamLink, streamVolume, soundEffects, cb) {
        var self = this;
        if (self.audioStreamTag.src != streamLink) {
            if (self.audioStream) {
                self.audioStream.disconnect();
                self.audioStream = null;
            }
            self.audioStreamTag.src = streamLink;
            self.audioStreamTag.oncanplaythrough = function() {
                self.audioStream = new Pizzicato.Sound({
                    'source': 'audioElement',
                    'options': {
                        'audioElement': self.audioStreamTag
                    }
                });
                soundEffects.forEach(soundEffect => self.audioStream.addEffect(soundEffect));
                self.audioStream.play();
                self.audioStream.volume = streamVolume;
                cb();
            };
        } else {
            if (self.audioStream) {
                self.audioStream = removeEffects(self.audioStream);
                soundEffects.forEach(effect => self.audioStream.addEffect(effect));
                if (!self.audioStream.playing) {
                    self.audioStream.play();
                }
                self.audioStream.volume = streamVolume;
            }
            cb();
        }
    }

    playAtmosphere(atmosphere, volumeOverride, cb) {
        this.atmosphereAudioManager.stopAllPlayingAudio();
        var promises = [];
        var self = this;
        atmosphere.getAudio().forEach(audio => {
            promises.push(new Promise((resolve) => {
                self.atmosphereAudioManager.playAudio(audio, [], volumeOverride, null, resolve);
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

function removeEffects(stream) {
    while (stream.effects.length > 0) {
        stream.removeEffect(stream.effects[0]);
    }
    return stream;
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

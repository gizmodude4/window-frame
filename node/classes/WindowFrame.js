const AudioContext = require('web-audio-api').AudioContext;
global.AudioContext = AudioContext;
var Pizzicato = require('pizzicato');


class WindowFrame {
    constructor(scenes, type, outputContext) {
        this.type = type || 'playlist';
        this.currentSong = undefined;
        this.currentAtmospheres = [];
        this.scenes = scenes;
        this.sceneIndex = 0;
        this.songIndex = 0;
        this.atmosphereIndex = 0;
        this.nextSceneTimeout = undefined;
        this.processingEvent = false;
        this.processingEventWatchdog = undefined;
        this.outputContext = outputContext;
    }

    playNextSong() {
        this.switchingAudio = true;
        var scene = this.scenes[this.sceneIndex];
        this.songIndex++;
        if (this.songIndex >= scene.getSongsCount()) {
            this.songIndex = 0;
        }
        this.stopAudio(this.currentSong);
        this.playSong(scene.getSong(this.songIndex));
        this.switchingAudio = false;
    }

    playNextAtmosphere() {
        var self = this;
        var scene = this.scenes[this.sceneIndex];
        this.atmosphereIndex++;
        if (this.atmosphereIndex >= scene.getAtmosphereCount()) {
            this.atmosphereIndex = 0;
        }
        this.currentAtmospheres.forEach(audio => self.stopAudio(audio));
        this.playAtmosphere(scene.getAtmosphere(this.atmosphereIndex));
    }

    showNextScene() {
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
        this.showScene(nextScene);
    }

    showScene(scene) {
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
        this.songIndex = 0;
        this.atmosphereIndex = 0;
        this.switchingAudio = true;
        this.switchingAtmosphere = true;
        this.playSong(scene.getSong(0));
        this.playAtmosphere(scene.getAtmosphere(0)); 
        this.switchingAudio = false;
    }

    playSong(song) {
        var self = this;
        stopAudio(this.currentSong);
        buildAudio(song, (audio) => {
            audio.connect(this.outputContext.destination);
            self.currentSong = audio;
        });
    }

    playAtmosphere(atmosphere) {
        var self = this;
        /*atmosphere.getAudio().forEach(audio => {
            buildAudio(audio, (loadedAudio) => {
                self.currentAtmospheres.push(loadedAudio);
                loadedAudio.connect(this.outputContext.destination);
            });
        });*/
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

function stopAudio(audio) {
    if (audio) {
        audio.disconnect();
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

function buildAudio(audio, finishedCb) {
    var newAudio = new Pizzicato.Sound({ 
        source: 'file',
        options: { 
            path: audio.getLink(), 
            volume: audio.getVolume()/100,
            release: audio.getFadeDuration()/1000,
            attack: audio.getFadeDuration()/1000,
            loop: audio.getLoop(),
            detached: true
        }
        }, function() {
            audio.getAudioEffects().forEach(effect => {
                var newEffect = createEffect(effect);
                newAudio.addEffect(newEffect);
            });
            finishedCb(newAudio);
        });
}

module.exports = WindowFrame;

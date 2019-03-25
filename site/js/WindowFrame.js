const Pizzicato = window.Pizzicato;

class WindowFrame {
    constructor(scenes, type, displayTag, songAudioManager, atmosphereAudioManager) {
        this.type = type || 'playlist';
        this.songAudioManager = songAudioManager;
        this.atmosphereAudioManager = atmosphereAudioManager;
        this.displayTag = displayTag;
        this.scenes = scenes;
        this.sceneIndex = 0;
        this.songIndex = 0;
        this.atmosphereIndex = 0;
        this.nextSceneTimeout = undefined;
        this.processingEvent = false;
        this.processingEventWatchdog = undefined;
    }

    playNextSong(cb) {
        this.switchingAudio = true;
        var scene = this.scenes[this.sceneIndex];
        this.songIndex++;
        if (this.songIndex >= scene.getSongsCount()) {
            this.songIndex = 0;
        }
        this.playSong(scene.getSong(this.songIndex), cb);
        this.switchingAudio = false;
    }

    playNextAtmosphere(cb) {
        var scene = this.scenes[this.sceneIndex];
        this.atmosphereIndex++;
        if (this.atmosphereIndex >= scene.getAtmosphereCount()) {
            this.atmosphereIndex = 0;
        }
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
        this.songIndex = 0;
        this.atmosphereIndex = 0;
        this.switchingAudio = true;
        this.switchingAtmosphere = true;
        this.playSong(scene.getSong(0));
        this.showImage(scene.getAtmosphere(0).getImage());
        this.playAtmosphere(scene.getAtmosphere(0), cb); 
        this.switchingAudio = false;
        this.switchingAudio = false;
    }

    showImage(image) {
        this.displayTag.style.backgroundImage = 'url(' + image + ')';
    }

    playSong(song, cb) {
        this.songAudioManager.stopAllPlayingAudio();
        this.songAudioManager.playAudio(song, () => {
            this.playNextSong();
        }, cb);
    }

    playAtmosphere(atmosphere, cb) {
        this.atmosphereAudioManager.stopAllPlayingAudio();
        var promises = [];
        var self = this;
        atmosphere.getAudio().forEach(audio => {
            promises.push(new Promise((resolve) => {
                self.atmosphereAudioManager.playAudio(audio, null, resolve);
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

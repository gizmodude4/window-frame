const Pizzicato = window.Pizzicato;

class WindowFrame {
    constructor(scenes, displayTag, songAudioManager, atmosphereAudioManager) {
        this.songAudioManager = songAudioManager;
        this.atmosphereAudioManager = atmosphereAudioManager;
        this.displayTag = displayTag;
        this.scenes = scenes;
        this.sceneIndex = 0;
        this.songIndex = 0;
        this.atmosphereIndex = 0;
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
        this.sceneIndex++;
        if (this.sceneIndex >= this.scenes.length) {
            this.sceneIndex = 0;
        }
        this.showScene(this.sceneIndex, cb);
    }

    showScene(index, cb) {
        var scene = this.scenes[index];
        this.sceneIndex = index;
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
        this.displayTag.style.backgroundImage = "url(" + image + ")";
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
            promises.push(new Promise(function(resolve) {
                self.atmosphereAudioManager.playAudio(audio, null, resolve);
            }));
        });
        if (promises.length > 0) {
            Promise.all(promises)
                .then(function() {
                    if (cb) {
                        cb();
                    }
                });
        } else {
            cb();
        }
    }
}

export default WindowFrame;

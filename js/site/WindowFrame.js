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

    playNextSong() {
        console.log("playNextSong triggered");
        var scene = this.scenes[this.sceneIndex];
        this.songIndex++;
        if (this.songIndex >= scene.getSongsCount()) {
            this.songIndex = 0;
        }
        this.playSong(scene.getSong(this.songIndex));
    }

    playNextAtmosphere() {
        var scene = this.scenes[this.sceneIndex];
        this.atmosphereIndex++;
        if (this.atmosphereIndex >= scene.getAtmosphereCount()) {
            this.atmosphereIndex = 0;
        }
        this.showImage(scene.getAtmosphere(this.atmosphereIndex).getImage());
        this.playAtmosphere(scene.getAtmosphere(this.atmosphereIndex));
    }

    showNextScene() {
        this.sceneIndex++;
        if (this.sceneIndex >= this.scenes.length) {
            this.sceneIndex = 0;
        }
        this.showScene(this.sceneIndex);
    }

    showScene(index) {
        var scene = this.scenes[index];
        this.sceneIndex = index;
        this.songIndex = 0;
        this.atmosphereIndex = 0;
        this.playSong(scene.getSong(0));
        this.showImage(scene.getAtmosphere(0).getImage());
        this.playAtmosphere(scene.getAtmosphere(0)); 
    }

    showImage(image) {
        this.displayTag.style.backgroundImage = "url(" + image + ")";
    }

    playSong(song) {
        console.log("playing song...");
        console.log(song);
        this.getAudio(song, audio => {
            audio.on('end', () => {
                console.log("onEnd triggered");
                this.songAudioManager.stopAllPlayingAudio();
                this.playNextSong()
            });
            this.songAudioManager.stopAllPlayingAudio();
            this.songAudioManager.playAudio(audio);
        });
    }

    playAtmosphere(atmosphere) {
        this.atmosphereAudioManager.stopAllPlayingAudio();
        atmosphere.getAudio().forEach(audio => {
            this.getAudio(audio, loadedAudio => {
                this.atmosphereAudioManager.playAudio(loadedAudio);
            });
        });
    }

    getAudio(audio, cb) {
        var newAudio = new Pizzicato.Sound({ 
            source: 'file',
            options: { 
                path: audio.getLink(), 
                volume: audio.getVolume()/100,
                release: audio.getFadeDuration()/1000,
                attack: audio.getFadeDuration()/1000,
                loop: audio.getLoop()
            }
            }, function() {
                audio.getAudioEffects().forEach(effect => {
                    var newEffect = createEffect(effect);
                    newAudio.addEffect(newEffect);
                });
                cb(newAudio);
            });
    }
}

function createEffect(effect) {
    switch(effect.type) {
        case "lpf":
            return new Pizzicato.Effects.LowPassFilter(effect.config);
        case "hpf":
            return new Pizzicato.Effects.HighPassFilter(effect.config);
        case "reverb":
            return new Pizzicato.Effects.Reverb(effect.config);
        default:
            throw "Unknown effect type " + effect.type; 
    }
}

/*
function playAudio(tag, song, volume, fadeDuration) {
    var lpfAudio =  new Pizzicato.Sound({ 
        source: 'file',
        options: { path: song, volume: volume, release: fadeDuration }
    }, function() {
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
        var hpf = new Pizzicato.Effects.HighPassFilter({
            frequency: 1000,
            peak: 10
        });

        var lpf = new Pizzicato.Effects.LowPassFilter({
            frequency: 500,
            peak: 10
        });

        var reverb = new Pizzicato.Effects.Reverb({
            time: 0.9,
            decay: 3,
            reverse: false,
            mix: 1
        });
        var lpfAudioReverb =  new Pizzicato.Sound(song, function() {
            lpfAudioReverb.addEffect(reverb);
            lpfAudioReverb.addEffect(hpf);
            lpfAudio.volume = 0.1;
            lpfAudio.play();
            lpfAudioReverb.play();
        });
    });
}*/

/* SAFE PLAY AUDIO
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
}*/

export default WindowFrame;

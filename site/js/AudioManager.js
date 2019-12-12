'use strict';

class AudioManager {
    constructor(audioEffectCreator) {
        this.audioEffectCreator = audioEffectCreator;
        this.currentlyPlayingAudio = [];
    }

    playAudio(audioDefinition, initialEffects, onEndCb, finishedCb) {
        console.log('playing ' + audioDefinition.getLink());
        try {
            getAudio(audioDefinition, initialEffects, audio => {
                audio.play();
                this.currentlyPlayingAudio.push(audio);
                audio.on("end", () => audio.disconnect());
                if (onEndCb) {
                    audio.on('end', onEndCb);
                }
                if (finishedCb) {
                    finishedCb();
                }
            });
        } catch(e) {
            console.log("Error playing song " + audioDefinition.getLink() + ". Skipping...")
            console.log(e.message);
            if (finishedCb) {
                finishedCb();
            }
            onEndCb();
        }
    }

    stopAllPlayingAudio() {
        this.currentlyPlayingAudio.forEach(audio => {
            audio.off('end');
            audio.on("end", () => audio.disconnect());
            audio.stop();
            audio = null;
        });
        this.currentlyPlayingAudio = [];
    }
}

function getAudio(audio, initialEffects, cb) {
    var self = this;
    var newAudio = new Pizzicato.Sound({ 
        source: 'file',
        options: { 
            path: audio.getLink(), 
            volume: audio.getVolume()/100,
            release: audio.getFadeDuration()/1000,
            attack: audio.getFadeDuration()/1000,
            loop: audio.getLoop()
        }
        }, function (err) {
            if (err) {
                throw err;
            }
            audio.getAudioEffects().forEach(effect => {
                var newEffect = self.audioEffectCreator.createEffect(effect);
                newAudio.addEffect(newEffect);
            });
            if (initialEffects && initialEffects.length > 0) {
                console.log('adding initial effects for ' + audio.getLink());
                initialEffects.forEach(effect => newAudio.addEffect(effect));
            }
            cb(newAudio);
        });
}

export default AudioManager;
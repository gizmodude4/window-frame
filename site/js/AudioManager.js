class AudioManager {
    constructor() {
        this.currentlyPlayingAudio = [];
    }

    playAudio(audioDefinition, onEndCb, finishedCb) {
        getAudio(audioDefinition, audio => {
            audio.play();
            this.currentlyPlayingAudio.push(audio);
            if (onEndCb) {
                audio.on('end', onEndCb);
            }
            if (finishedCb) {
                finishedCb();
            }
        });
    }

    stopAllPlayingAudio() {
        this.currentlyPlayingAudio.forEach(audio => {
            audio.off('end');
            audio.stop();
            audio.disconnect();
        });
        this.currentlyPlayingAudio = [];
    }
}

function getAudio(audio, cb) {
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

function createEffect(effect) {
    switch(effect.type) {
        case 'lpf':
            return new Pizzicato.Effects.LowPassFilter(effect.config);
        case 'hpf':
            return new Pizzicato.Effects.HighPassFilter(effect.config);
        case 'reverb':
            return new Pizzicato.Effects.Reverb(effect.config);
        default:
            throw 'Unknown effect type ' + effect.type; 
    }
}

export default AudioManager;
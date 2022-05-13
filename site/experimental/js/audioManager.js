let audioElement;
let audioStream;
let streamError = 0;
let currentlyPlayingFileAudio = {};

export const initializeAudio = (elem) => {
    audioElement = elem;
    audioElement.addEventListener('error', () => {
        streamError++;
        console.error('Audio stream error, reloading...');
        if (streamError < 5) {
            audioElement.load();
        } else {
            console.error('Audio stream error, retries exhausted');
        }
    });
}

export const createEffect = (type, config) => {
    switch (type) {
        case 'lpf':
            return new Pizzicato.Effects.LowPassFilter(config);
        case 'hpf':
            return new Pizzicato.Effects.HighPassFilter(config);
        case 'reverb':
            return new Pizzicato.Effects.Reverb(config);
        default:
            throw 'Unknown effect type ' + type; 
    }
}

export const playStream = async (streamLink, streamVolume, soundEffects, isChromium, cb) => {
    if (audioElement.src != streamLink) {
        if (audioStream) {
           audioStream.disconnect();
           audioStream = null;
        }
        audioElement.src = streamLink;
        audioElement.oncanplaythrough = () => {
            audioStream = new Pizzicato.Sound({
                'source': 'audioElement',
                'options': {
                    'audioElement': audioElement
                }
            });
            applyEffects(audioStream, soundEffects);
            audioStream.play();
            audioStream.volume = streamVolume/100;
            audioElement.volume = streamVolume/100;
            audioElement.muted = isChromium;
            cb && cb();
        };
    } else {
        if (audioStream) {
           removeEffects(audioStream);
           applyEffects(audioStream, soundEffects);
            if (!audioStream.playing) {
               audioStream.play();
            }
            audioStream.volume = streamVolume/100;
            audioElement.volume = streamVolume/100;
            audioElement.muted = isChromium;
        }
        cb && cb();
    }
}

export const disableEffects = () => {
    removeEffects(audioStream);
    for (let url in currentlyPlayingFileAudio) {
        removeEffects(currentlyPlayingFileAudio[url]);
    }
}

export const reenableEffects = (scene) => {
    applyEffects(audioStream, scene.stream.effects);
    scene.sounds.forEach(sound => {
        applyEffects(currentlyPlayingFileAudio[sound.url], sound.effects);
    });
}

const removeEffects = (audio) => {
    while (audio.effects.length > 0) {
        audio.removeEffect(audio.effects[0]);
    }
}

const applyEffects = (audio, effects) => {
    effects && effects.forEach(effect => audio.addEffect(effect));
}

const playAudio = async (audioDefinition, volume) => {
    volume = volume ? volume/100 : 1;
    try {
        return playSoundFromFile(audioDefinition, volume).then(audio => {
            audio.play();
            currentlyPlayingFileAudio[audioDefinition.url] = audio;
            audio.on("end", audio.disconnect);
        });
    } catch(e) {
        console.error("Error playing song " + audioDefinition.link + ". Skipping...")
        console.error(e);
    }
    return Promise.resolve();
}

export const playSounds = async (sounds, volume) => {
    stopAllPlayingAudio();
    var promises = [];
    sounds.forEach(audio => {
        promises.push(playAudio(audio, volume));
    });
    if (promises.length > 0) {
        return Promise.all(promises);
    }
 }

export const stopAllPlayingAudio = () => {
    Object.keys(currentlyPlayingFileAudio).forEach(audioLink => {
        var audio = currentlyPlayingFileAudio[audioLink];
        audio.off('end');
        audio.on("end", () => audio.disconnect());
        audio.stop();
    });
    currentlyPlayingFileAudio = {};
}

export const setCurrentlyPlayingStreamVolume = (volume, isChromium) => {
    if (audioElement) {
        audioElement.volume = volume/100;
        audioElement.muted = isChromium;
    }
    if (audioStream) {
        audioStream.volume = volume/100;
    }
}

export const setCurrentlyPlayingSoundVolume = (audioLink, volume) => {
    if (audioLink in currentlyPlayingFileAudio) {
       currentlyPlayingFileAudio[audioLink].volume = volume/100;
    }
}

export const playNextSong = (id, cb) => {
    // This only works for the localhosted audio stream
    // id = scenes[sceneIndex].id
    fetch(`http://localhost:8080/scenes/${id}/skip`, {method: 'PUT'}).then(cb)
}

const playSoundFromFile = async (audio, volumeOverride) => {
    return new Promise((resolve) => {
        const newAudio = new Pizzicato.Sound({ 
            source: 'file',
            options: { 
                path: audio.url, 
                volume: volumeOverride * (audio.volume/100),
                release: audio.fadeDuration/1000,
                attack: audio.fadeDuration/1000,
                loop: audio.loop
            }
        }, (err) => {
            if (err) {
                throw err;
            }
            audio.effects && applyEffects(newAudio, audio.effects);
            resolve(newAudio);
        });
    });
}

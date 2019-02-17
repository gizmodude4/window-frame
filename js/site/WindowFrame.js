class WindowFrame {
    constructor(scenes, displayTag, musicTag, effectTag) {
        this.displayTag = displayTag;
        this.scenes = scenes;
        this.musicTag = musicTag;
        this.effectTag = effectTag;
        this.sceneIndex = 0;
        this.songIndex = 0;
        this.effectIndex = 0;
        this.effectEnabled = false;
    }

    playNextSong() {
        console.log(this.scenes);
        var scene = this.scenes[this.sceneIndex];
        console.log(scene)
        this.songIndex++;
        if (this.songIndex >= scene.getSongsCount()) {
            this.songIndex = 0;
        }
        var song = scene.getSong(this.songIndex);
        console.log(this.songIndex);
        console.log(song);
        playAudio(this.musicTag, song.getLink(), song.getVolume(), song.getFadeDuration());
    }

    playNextEffect() {
        var scene = this.scenes[this.sceneIndex];
        this.effectIndex++;
        if (!this.effectEnabled) {
            this.effectEnabled = true;
            this.effectIndex = 0;
        } else if (this.effectIndex >= scene.getEffectsCount()) {
            this.effectIndex = 0;
            this.effectEnabled = false;
        }

        if (this.effectEnabled) {
            var effect = scene.getEffect(this.effectIndex);
            playAudio(this.effectTag, effect.getLink(), effect.getVolume(), effect.getFadeDuration());
        } else {
            stopAudio(this.effectTag);
        }
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
        this.songIndex = 0;
        this.effectEnabled = false;
        this.effectIndex = 0;
        var song = scene.getSong(0);
        this.showImage();
        playAudio(this.musicTag, song.getLink(), song.getVolume(), song.getFadeDuration()); 
    }

    showImage() {
        var scene = this.scenes[this.sceneIndex];
        this.displayTag.style.backgroundImage = "url(" + scene.getImage() + ")";
    }

}

function stopAudio(tag) {
    tag.pause();
    tag.currentTime = 0;
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

export default WindowFrame;
class AudioManager {
    constructor() {
        this.currentlyPlayingAudio = [];
    }

    playAudio(audio) {
        audio.play();
        this.currentlyPlayingAudio.push(audio);
    }

    stopAllPlayingAudio() {
        this.currentlyPlayingAudio.forEach(audio => audio.stop());
        this.currentlyPlayingAudio = [];
    }
}

export default AudioManager;
class SceneAudio {
    constructor(link, volume, fadeDuration, loop, audioEffects) {
        this.link = link;
        this.volume = volume || 75;
        this.fadeDuration = fadeDuration || 0;
        this.loop = loop || false;
        this.audioEffects = audioEffects || [];
    }

    getLink() {
        return this.link;
    }

    getVolume() {
        return this.volume;
    }

    getFadeDuration() {
        return this.fadeDuration;
    }

    getLoop() {
        return this.loop;
    }

    getAudioEffects() {
        return this.audioEffects;
    }
}

export default SceneAudio;
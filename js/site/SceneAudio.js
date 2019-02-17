class SceneAudio {
    constructor(link, volume, fadeDuration) {
        this.link = link;
        this.volume = volume || 75;
        this.fadeDuration = fadeDuration || 0;
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
}

export default SceneAudio;
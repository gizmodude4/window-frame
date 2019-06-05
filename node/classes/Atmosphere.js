class Atmosphere {
    constructor(image, audio) {
      this.image = image;
      this.audio = audio || [];
    }

    getImage() {
        return this.image;
    }

    getAudio() {
        return this.audio;
    }

    getAudioCount() {
        return this.audio.length;
    }
}

module.exports = Atmosphere;
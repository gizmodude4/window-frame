'use strict';

class Atmosphere {
    constructor(image, name, streamVolume, audio) {
      this.image = image;
      this.name = name;
      this.streamVolume = streamVolume || null;
      this.audio = audio || [];
    }

    getName() {
        return this.name;
    }

    getImage() {
        return this.image;
    }

    getStreamVolume() {
        return this.streamVolume;
    }

    getAudio() {
        return this.audio;
    }

    getAudioCount() {
        return this.audio.length;
    }
}

export default Atmosphere;
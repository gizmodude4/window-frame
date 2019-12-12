'use strict';

class Atmosphere {
    constructor(image, name, audio) {
      this.image = image;
      this.name = name;
      this.audio = audio || [];
    }

    getName() {
        return this.name;
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

export default Atmosphere;
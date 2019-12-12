'use strict';

class Scene {
    constructor(id, stream, songSoundEffects, atmosphere, endTime) {
      this.id = id;
      this.stream = stream;
      this.songSoundEffects = songSoundEffects;
      this.atmosphere = atmosphere;
      this.endTime = endTime;
    }

    getId() {
        return this.id;
    }

    getStream() {
        return this.stream;
    }

    getSongSoundEffects() {
        return this.songSoundEffects;
    }

    getAllAtmospheres() {
        return this.atmosphere;
    }

    getAtmosphere(index) {
        return this.atmosphere[index];
    }

    getAtmosphereCount() {
        return this.atmosphere.length;
    }

    getEndTime() {
        return this.endTime;
    }
}

export default Scene;
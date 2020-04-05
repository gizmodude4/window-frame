'use strict';

class Scene {
    constructor(id, stream, streamVolume, songSoundEffects, atmosphere, endTime) {
      this.id = id;
      this.stream = stream;
      this.streamVolume = streamVolume ? streamVolume : 100;
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

    getStreamVolume() {
        return this.streamVolume;
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
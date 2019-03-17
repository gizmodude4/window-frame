class Scene {
    constructor(songs, atmosphere, endTime) {
      this.songs = songs;
      this.atmosphere = atmosphere;
      this.endTime = endTime;
    }

    getSong(index) {
        return this.songs[index];
    }

    getSongsCount() {
        return this.songs.length;
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
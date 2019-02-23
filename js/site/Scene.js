class Scene {
    constructor(songs, atmosphere) {
      this.songs = songs;
      this.atmosphere = atmosphere;
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
}

export default Scene;
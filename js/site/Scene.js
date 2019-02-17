class Scene {
    constructor(image, songs, effects) {
      this.image = image;
      this.songs = songs;
      this.effects = effects;
    }

    getSong(index) {
        return this.songs[index];
    }

    getSongsCount() {
        return this.songs.length;
    }

    getEffect(index) {
        return this.effects[index];
    }

    getEffectsCount() {
        return this.effects.length;
    }

    getImage() {
        return this.image;
    }
}

export default Scene;
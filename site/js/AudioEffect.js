'use strict';

class AudioEffect {
    constructor(type, config) {
        this.type = type;
        this.config = config;
    }

    getType() {
        return this.type;
    }

    getConfig() {
        return this.config;
    }
}

export default AudioEffect;
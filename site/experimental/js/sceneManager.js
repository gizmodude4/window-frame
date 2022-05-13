import { createEffect } from './audioManager.js';

// From JSON to audio effects and whatnots
export const initializeScenes = (inputScenes) => {
    const scenes = [];
    inputScenes.scenes.forEach(function(sceneConfig) {
        // Create audio effects for stream audio
        sceneConfig.sounds.forEach(function(sound) {
            // Create audio effects for each scene background audio
            if (sound.effects && sound.effects.length > 0) {
                sound.effects = toAudioEffects(sound.effects)
            }
        });
        sceneConfig.stream.effects = toAudioEffects(sceneConfig.stream.effects);
        scenes.push(sceneConfig);
    });
    return scenes;
}

const toAudioEffects = (audioEffectConfig) => {
    if (audioEffectConfig && audioEffectConfig.length > 0) {
        const audioEffects = [];
        audioEffectConfig.forEach(effectConfig => {
            audioEffects.push(createEffect(effectConfig['effectType'], effectConfig['config']));
        });
        return audioEffects
    }
    return [];
}
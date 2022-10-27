import { createEffect, playStream, playSounds } from './audioManager.js';
import { getConfigProperty } from './config.js';

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

// Scene display logic
export async function playSceneAudio(scene) {
    const streamMuted = getConfigProperty("streamMuted");
    const streamVol = streamMuted ? 0 : scene.stream.volume/100 * getConfigProperty("streamVolume") / 100;
    await playStream(scene.stream.url, streamVol, scene.stream.effects);
    const ambianceMuted = getConfigProperty("ambianceMuted");
    const ambianceVol = ambianceMuted ? 0 : getConfigProperty("ambianceVolume")/100
    await playSounds(scene.sounds, ambianceVol);
}

export function isSceneMeaningfullyDifferent(prevScene, curScene) {
    return curScene.image != prevScene.image ||
           curScene.nightLights != prevScene.nightLights ||
           curScene.horizonY != prevScene.horizonY ||
           areAnimationsMeaningfullyDifferent(prevScene.animations, curScene.animations)
}

export function areAnimationsMeaningfullyDifferent(prevAnimations, curAnimations) {
    if (prevAnimations.length != curAnimations.length) {
        return true;
    }

    const prevAnimationsImages = [];
    const curAnimationsImages = [];
    for (let i = 0; i < prevAnimations.length; i++) {
        prevAnimationsImages.push(prevAnimations[i].image)
        curAnimationsImages.push(curAnimations[i].image)
    }

    return prevAnimationsImages.filter(x => !curAnimationsImages.includes(x)).length > 0;
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
import { getSunInfo } from './getSunInfo.js';
import { processSkySprites, addSkySprite, resetSkySprites, resizeSkySprites } from './skySprites.js';
import { getShaderInfo } from './shaderUtils.js';
import {
    initializeAudio,
    playStream,
    playSounds,
    setCurrentlyPlayingStreamVolume,
    setCurrentlyPlayingSoundVolume,
    disableEffects,
    reenableEffects } from './audioManager.js';
import { initializeScenes } from './sceneManager.js'
import { getConfigProperty, updateConfig } from './config.js';
import { initializeBackend, getCollections, getGeoData, sendSocketMessage } from './backendApiManager.js';

const foregroundDayNightShaderRaw = document.getElementById("foregroundDayNightShader").innerHTML;
const skyDayNightShaderRaw = document.getElementById("skyDayNightShader").innerHTML;
const timeDisplay = document.getElementById("time");
const loadingScreen = document.getElementById("loading");
const artistMetadata = document.getElementById("artist-metadata");
const longPressTime = 3000;
const stream = document.getElementById('player');
const isChromium = window.chrome ? true : false;
const transitionEndEventName = getTransitionEndEventName();
let processing = false;
const initialHeight = window.innerHeight;
const initialWidth = window.innerWidth;
let curHeight = window.innerHeight;
let curWidth = window.innerWidth;

let backendServerUrl = 'http://localhost:8080';
let backendServerWebsocket = 'ws://localhost:8080'
if (location.origin === 'https://lazyday.cafe') {
    backendServerUrl = 'https://backend.lazyday.cafe';
    backendServerWebsocket = 'wss://backend.lazyday.cafe';
}

initializeAudio(stream);
await initializeBackend(backendServerUrl, backendServerWebsocket, (metadata) => {
    artistMetadata.innerText = metadata.data
});

let now = luxon.DateTime.now();
let shaderOverride = getTime();

const pos = await getGeoData();
let sunInfo = getSunInfo(now, pos);
let horizonY = 0.5;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.SORTABLE_CHILDREN = true;
const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight,
    backgroundColor: 0x1099bb, resolution: window.devicePixelRatio || 1,
    sharedTicker: true
});
const loader = PIXI.Loader.shared;
const SPRITE_LIMIT = 30;
const spritePool = [];

// Sprites
const landscape = new PIXI.Sprite();
const lights = new PIXI.Sprite();
const backgroundSprites = new PIXI.Container();
const midgroundSprites = new PIXI.Container();
const foregroundSprites = new PIXI.Container();

let collectionIndex = 0;
let sceneIndex = 0;
const collections = await getCollections();
var scenes = initializeScenes(collections[collectionIndex]);
horizonY = scenes[sceneIndex].horizonY
loadTextures(scenes);
document.getElementById("body").appendChild(app.view);

// Shaders
var curShaderInfo = getShaderInfo(now, sunInfo)
const foregroundDayNightShader = new PIXI.Filter(null, foregroundDayNightShaderRaw, curShaderInfo.foreground);
const cloudDayNightShader = new PIXI.Filter(null, foregroundDayNightShaderRaw, curShaderInfo.clouds);

// background
const backgroundColor1 = [0, 1/255, 26/255]
const backgroundColor2 = [4/255, 7/255, 48/255]
const backgroundSizeBuffer = PIXI.Buffer.from(new Float32Array([0, 0, window.innerWidth, 0, window.innerWidth, window.innerHeight, 0, window.innerHeight]))
const quadUvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

const quadGeometry = new PIXI.Geometry()
    .addAttribute('aVertexPosition', backgroundSizeBuffer, 2)
    .addAttribute('aTextureCoord', quadUvs, 2)
    .addIndex([0, 1, 2, 0, 2, 3]);
let background;
let backgroundShader;

/*
TODO:
- Size correctly for mobile
- If we change the volume on a slider, do we want to unmute?
- random animations
*/

// UI elements
var modal = document.getElementById("consent-modal");
var btn = document.getElementById("consent-button");
btn.onclick = () => {
    modal.style.display = "none";
    playSceneAudio();
} 

const sideBar = document.querySelector('.side-bar');
sideBar.onclick = (event) => {
    if (event.target == sideBar && sideBar.classList.contains('collapse')) {
        sideBar.classList.toggle('collapse');
        hideOnClickOutside(sideBar);
    }
};

function hideOnClickOutside(element) {
    const outsideClickListener = event => {
        if (!element.contains(event.target)) {
          element.classList.toggle('collapse');
          removeClickListener();
        }
    }
    const removeClickListener = () => {
        document.removeEventListener('click', outsideClickListener);
    }
    document.addEventListener('click', outsideClickListener);
}

const timeOfDaySlider = document.getElementById("day-slider");
const timeOfDaySliderContainer = document.querySelector(".time-of-day-slider-container");
const timeOfDayTooltip = document.getElementById("time-of-day-tooltip");
timeOfDaySlider.value = timeToDayPercent(now) * timeOfDaySlider.max;
updateSliderDisplay();

timeOfDaySlider.oninput = () => {
    updateSliderDisplay();    
    updateShaderInfo(shaderOverride);
}

function updateSliderDisplay () {
    const percent = timeOfDaySlider.value/timeOfDaySlider.max;
    shaderOverride = getTime(percent);
    if (percent > 0.9) {
        timeOfDayTooltip.style.removeProperty("left");
        timeOfDayTooltip.style.right = `${(1-percent)*100}%`;
    } else {
        timeOfDayTooltip.style.removeProperty("right");
        timeOfDayTooltip.style.left = `${percent*100}%`;
    }
    timeOfDayTooltip.innerHTML = shaderOverride.toLocaleString(luxon.DateTime.TIME_WITH_SECONDS);
}

const timeOfDayButton = document.querySelector("#time-of-day");
const timeOfDayCheckbox = document.querySelector("#time-of-day-checkbox");
const timeOfDayIcon = document.querySelector("#time-of-day-icon");
timeOfDayCheckbox.checked = getConfigProperty("dynamicTimeOfDay");
toggleTimeOfDay(timeOfDayCheckbox.checked);
timeOfDayButton.onclick = (event) => {
    // This is to avoid double processing onclick, which happens
    // because the span and checkbox are on top of each other.
    event.preventDefault();
    timeOfDayCheckbox.checked = !timeOfDayCheckbox.checked;
    toggleTimeOfDay(timeOfDayCheckbox.checked);
    setSvgActive(timeOfDayIcon, timeOfDayCheckbox.checked)
    updateConfig({dynamicTimeOfDay: timeOfDayCheckbox.checked});
}

function toggleTimeOfDay(timeOfDayOn) {
    if (timeOfDayOn) {
        timeOfDaySlider.disabled = true;
        timeOfDaySliderContainer.classList.add("hidden")
    } else {
        timeOfDaySlider.disabled = false;
        timeOfDaySliderContainer.classList.remove("hidden")
    }
}

const audioFiltersButton = document.querySelector("#audio-filters");
const audioFiltersCheckbox = document.querySelector("#audio-filters-checkbox");
const audioFiltersIcon = document.querySelector("#audio-filters-icon");
audioFiltersCheckbox.checked = getConfigProperty("audioFiltersOn");
audioFiltersButton.onclick = (event) => {
    // This is to avoid double processing onclick, which happens
    // because the span and checkbox are on top of each other.
    event.preventDefault();
    audioFiltersCheckbox.checked = !audioFiltersCheckbox.checked;
    setSvgActive(audioFiltersIcon, audioFiltersCheckbox.checked);
    if (audioFiltersCheckbox.checked) {
        reenableEffects(scenes[sceneIndex]);
    } else {
        disableEffects();
    }
    updateConfig({audioFiltersOn: audioFiltersCheckbox.checked});
}

const nextButton = document.querySelector("#next");
nextButton.onclick = () => {
    loadNextScene();
}
const prevButton = document.querySelector("#prev");
prevButton.onclick = () => {
    loadPrevScene();
}

if (scenes.length <= 1) {
    nextButton.style.display = "none";
    prevButton.style.display = "none";
}

const musicSlider = document.querySelector("#music");
musicSlider.value = getConfigProperty("streamVolume");
musicSlider.oninput = () => {
    const muted = getConfigProperty("streamMuted");
    const volPercent = muted ? 0 : musicSlider.value/100;
    updateConfig({streamVolume: musicSlider.value});
    setCurrentlyPlayingStreamVolume(volPercent * scenes[sceneIndex].stream.volume/100);
}

const ambianceSlider = document.querySelector("#ambiance");
ambianceSlider.value = getConfigProperty("ambianceVolume");
ambianceSlider.oninput = () => {
    const muted = getConfigProperty("ambianceMuted");
    const volPercent = muted ? 0 : ambianceSlider.value/100;
    updateConfig({ambianceVolume: ambianceSlider.value});
    scenes[sceneIndex].sounds.forEach(sound => {
        setCurrentlyPlayingSoundVolume(sound, volPercent * sound.volume/100);
    });
}

const musicIcon = document.querySelector("#music-icon");
musicIcon.onclick = () => {
    const muted = !(!!getConfigProperty("streamMuted"));
    setSvgActive(musicIcon, !muted);
    updateConfig({streamMuted: muted});
    const volPercent = musicSlider.value/100;
    const newVol = muted ? 0 : volPercent * scenes[sceneIndex].stream.volume/100;
    setCurrentlyPlayingStreamVolume(newVol);
}

const ambianceIcon = document.querySelector("#ambiance-icon");
ambianceIcon.onclick = () => {
    const muted = !(!!getConfigProperty("ambianceMuted"));
    setSvgActive(ambianceIcon, !muted);
    updateConfig({ambianceMuted: muted});
    const volPercent = ambianceSlider.value/100;
    const newVol = muted ? 0 : volPercent * scenes[sceneIndex].stream.volume/100;
    scenes[sceneIndex].sounds.forEach(sound => {
        setCurrentlyPlayingSoundVolume(sound, newVol);
    });
}

function setIconsEnabled() {
    const musicMuted = (!!getConfigProperty("streamMuted"));
    setSvgActive(musicIcon, !musicMuted);
    const ambianceMuted = (!!getConfigProperty("ambianceMuted"));
    setSvgActive(ambianceIcon, !ambianceMuted);
    const dynamicTimeOfDay = (!!getConfigProperty("dynamicTimeOfDay"));
    setSvgActive(timeOfDayIcon, dynamicTimeOfDay)
    const audioFiltersOn = (!!getConfigProperty("audioFiltersOn"));
    setSvgActive(audioFiltersIcon, audioFiltersOn);
}
setIconsEnabled();

// The `load` method loads the queue of resources, and calls the passed in callback called once all
// resources have loaded.
loader.load((_, resources) => {   
    landscape.anchor.set(0.5);
    landscape.filters = [foregroundDayNightShader]
    landscape.texture = loader.resources[scenes[sceneIndex].image].texture;
    if (scenes[sceneIndex].nightLights) {
        lights.texture = loader.resources[scenes[sceneIndex].nightLights].texture;
        foregroundDayNightShader.uniforms.lights = lights._texture;
        lights.position.set(0,0);
    } else {
        lights.texture = null;
        foregroundDayNightShader.uniforms.lights = null;
    }
    lights.visible = false;
    horizonY = scenes[sceneIndex].horizonY;
    

    // pass 2 colors and X coordinate for shading
    backgroundShader = new PIXI.Shader.from(null, skyDayNightShaderRaw, {
        color1: curShaderInfo ? curShaderInfo.sky.color1 :  backgroundColor1,
        color2: curShaderInfo ? curShaderInfo.sky.color2 :  backgroundColor2,
        horizonY: horizonY
    })
    for (let i = 0; i < SPRITE_LIMIT; i++) {
        spritePool.push(new PIXI.Sprite());
        spritePool[spritePool.length-1].id = generateRandomId()
        app.stage.addChild(spritePool[spritePool.length-1])
    }
    
    background = new PIXI.Mesh(quadGeometry, backgroundShader);
    app.stage.addChild(background);
    app.stage.addChild(backgroundSprites);
    app.stage.addChild(midgroundSprites);
    app.stage.addChild(foregroundSprites);
    
    midgroundSprites.addChild(landscape);
    midgroundSprites.addChild(lights);
    background.position.set(0, 0);
    resize();
    loadingScreen.classList.add("hide-opacity");
});

// Update Sky Sprites
setInterval(() => {
    const selectedIndices = [];
    const spawnRand = Math.random();
    for (let i = 0; i < scenes[sceneIndex].animations.length; i++) {
        if (spawnRand < scenes[sceneIndex].animations[i].spawnChance) {
            selectedIndices.push(i);
        }
    }
    if (selectedIndices.length > 0) {
        const selectedIndex = getRandomValue(selectedIndices)
        const texture = loader.resources[scenes[sceneIndex].animations[selectedIndex].image].texture
        const rand = Math.random();
        const posY = rand * horizonY * app.screen.height/window.devicePixelRatio;
        const sizeMod = scenes[sceneIndex].animations[selectedIndex].sizeMod === 0 ? 1.0 :
                        scenes[sceneIndex].animations[selectedIndex].sizeMod - rand;

        if (rand > scenes[sceneIndex].animations[selectedIndex].backgroundChance) {
            addSkySprite(texture, posY, scenes[sceneIndex].animations[selectedIndex].movement,
                app.screen.width, sizeMod, backgroundSprites, spritePool, cloudDayNightShader);
        } else {
            addSkySprite(texture, posY, scenes[sceneIndex].animations[selectedIndex].movement,
                app.screen.width, sizeMod, foregroundSprites, spritePool, cloudDayNightShader);
        }
    }
}, 1000)


// Update Shaders every minute
setInterval(() => {
    let oldHour = now.hour;
    now = luxon.DateTime.now();
    let curHour = now.hour;
    let forceRefresh = false;
    // This means we've flipped days
    if (oldHour != curHour && curHour == 0) {
        sunInfo = getSunInfo(now, pos);
        forceRefresh = true;
    }
    if (timeOfDayCheckbox.checked){
        updateShaderInfo(now, forceRefresh);
    }
    showTimeDisplay(now);
}, 1000);

requestAnimationFrame(animate);

function animate() {
    processSkySprites(app, spritePool);
    app.renderer.render(app.stage);
    requestAnimationFrame(animate);
}


window.addEventListener('resize', resize);

// Resize function window
function resize(event) {
    app.renderer.resize(window.innerWidth, window.innerHeight);

    if (landscape){
        landscape.position.set(window.innerWidth/(window.devicePixelRatio*2), window.innerHeight/(window.devicePixelRatio*2));
        if (landscape.height > 1) {
            landscape.height = Math.floor(app.screen.height/window.devicePixelRatio);
            landscape.width = Math.floor(app.screen.width/window.devicePixelRatio);
            lights.height = Math.floor(app.screen.height/window.devicePixelRatio);
            lights.width = Math.floor(app.screen.width/window.devicePixelRatio);
        }
    }

    backgroundSizeBuffer.update(new Float32Array([0, 0, window.innerWidth, 0, window.innerWidth, window.innerHeight, 0, window.innerHeight]))
    
    resizeSkySprites(window.innerWidth/curWidth, window.innerHeight/curHeight, window.innerWidth/initialWidth, window.innerHeight/initialHeight)
    curHeight = window.innerHeight;
    curWidth = window.innerWidth;
}

function updateShaderInfo(time, forceRefresh = false) {
    let info = getShaderInfo(time, sunInfo, forceRefresh)
    if (info != curShaderInfo) {
        curShaderInfo = info;
        foregroundDayNightShader.uniforms.color = info.foreground.color;
        foregroundDayNightShader.uniforms.con_sat_brt = info.foreground.con_sat_brt;
        foregroundDayNightShader.uniforms.light_strength = info.foreground.light_strength;
        cloudDayNightShader.uniforms.color = info.clouds.color;
        cloudDayNightShader.uniforms.con_sat_brt = info.clouds.con_sat_brt;
        cloudDayNightShader.uniforms.light_strength = 0.0;
        backgroundShader.uniforms.color1 = info.sky.color1;
        backgroundShader.uniforms.color2 = info.sky.color2;
    }
}

function getTime(percentage = 0) {
    return luxon.DateTime.now()
        .set({hour: 0, minute: 0, second: 0, millisecond: 0})
        .plus({seconds: percentage*24*60*60});
}

function timeToDayPercent(now) {
    return (now.hour * 60 * 60 + now.minute * 60 + now.second) / 86400;
}

function showTimeDisplay(time) {
    timeDisplay.innerHTML = time.toLocal().toLocaleString(luxon.DateTime.TIME_WITH_SECONDS);
}

function loadTextures(scenes) {
    const addedTextures = new Set();
    scenes.forEach((scene) => {
        if (scene.nightLights && !addedTextures.has(scene.nightLights)) {
            addedTextures.add(scene.nightLights)
            loader.add(scene.nightLights, scene.nightLights)
        }
        if (!addedTextures.has(scene.image)) {
            addedTextures.add(scene.image)
            loader.add(scene.image, scene.image)
        }
        if (scene.animations && scene.animations.length > 0) {
            scene.animations.forEach((animation) => {
                if (!addedTextures.has(animation.image)) {
                    addedTextures.add(animation.image)
                    loader.add(animation.image, animation.image)
                }
            })
        }
    })
}

function getTransitionEndEventName() {
    var transitions = {
        "transition"      : "transitionend",
        "OTransition"     : "oTransitionEnd",
        "MozTransition"   : "transitionend",
        "WebkitTransition": "webkitTransitionEnd"
        }
    for(let transition in transitions) {
        if(document.body.style[transition] != undefined) {
            return transitions[transition];
        } 
    }
}

async function loadNextScene() {
    const nextSceneIndex = (sceneIndex === scenes.length - 1) ? 0 : sceneIndex + 1;
    return loadScene(nextSceneIndex);
}

async function loadPrevScene() {
    const prevSceneIndex = (sceneIndex === 0) ? scenes.length - 1 : sceneIndex - 1;
    return loadScene(prevSceneIndex);
}

async function loadScene(nextSceneIndex) {
    processing = true;
    const needLoadScreen = isSceneMeaningfullyDifferent(sceneIndex, nextSceneIndex);
    sceneIndex = nextSceneIndex;
    if (needLoadScreen) {
        loadingScreen.addEventListener(transitionEndEventName, async function loadSceneAfterTransition (){
            removeAllChildren(backgroundSprites)
            removeAllChildren(foregroundSprites)
            resetSkySprites(spritePool)
            landscape.texture = loader.resources[scenes[sceneIndex].image].texture;
            if (scenes[sceneIndex].nightLights) {
                lights.texture = loader.resources[scenes[sceneIndex].nightLights].texture;
                foregroundDayNightShader.uniforms.lights = lights._texture;
                lights.position.set(0,0);
            } else {
                lights.texture = null;
                foregroundDayNightShader.uniforms.lights = null;
            }
            horizonY = scenes[sceneIndex].horizonY;
            backgroundShader.uniforms.horizonY = horizonY;
            await playSceneAudio()
            loadingScreen.removeEventListener(transitionEndEventName, loadSceneAfterTransition);
            loadingScreen.classList.add("hide-opacity");
            setTimeout(() => {processing = false}, 1000);
        });
        loadingScreen.classList.remove("hide-opacity");
    } else {
        await playSceneAudio()
        processing = false;
    }
}

// Scene display logic
async function playSceneAudio() {
    const streamMuted = getConfigProperty("streamMuted");
    const streamVol = streamMuted ? 0 : scenes[sceneIndex].stream.volume/100 * getConfigProperty("streamVolume") / 100;
    await playStream(scenes[sceneIndex].stream.url, streamVol, scenes[sceneIndex].stream.effects, isChromium)
    const ambianceMuted = getConfigProperty("ambianceMuted");
    const ambianceVol = ambianceMuted ? 0 : getConfigProperty("ambianceVolume")/100
    await playSounds(scenes[sceneIndex].sounds, ambianceVol);
    sendSocketMessage(scenes[sceneIndex].stream.url);
}

function isSceneMeaningfullyDifferent(prevSceneIndex, curSceneIndex) {
    return scenes[curSceneIndex].image != scenes[prevSceneIndex].image ||
           scenes[curSceneIndex].nightLights != scenes[prevSceneIndex].nightLights ||
           scenes[curSceneIndex].horizonY != scenes[prevSceneIndex].horizonY ||
           areAnimationsMeaningfullyDifferent(scenes[prevSceneIndex].animations, scenes[curSceneIndex].animations)
}

function areAnimationsMeaningfullyDifferent(prevAnimations, curAnimations) {
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

function removeAllChildren(container) {
    while (container.children && container.children.length > 0) {
        container.children[0].filters = []
        spritePool.push(container.children[0]);
        container.removeChild(container.children[0]);
    }
}

// Keyboard shortcuts
let lastKeyPressed = null;
let lastKeyPressedTime = null;

function saveKeyPressed(event) {
    lastKeyPressed = event.key;
    lastKeyPressedTime = Date.now();
}

function keyToAction(key) {
    switch(key) {
        case 's':
            return 'switch_scene';
        default:
            return undefined;
    }
}

function processEvent(event) {
    if (lastKeyPressed == event.key && (Date.now() - lastKeyPressedTime) > longPressTime) {
        location.reload(true);
        return;
    }
    if (processing) {
        console.debug("Currently processing, ignoring event...")
        return;
    }

    var action = null;
    if (event.key) {
        action = keyToAction(event.key);
    } else if (event.data) {
        action = event.data;
    }
    switch(action) {
        case 'switch_scene':
            loadNextScene();
            break;    
        default:
            console.log('Unknown action type: ' + action);
            break;
    }
}

function generateRandomId() {
    const dateVal = new Date().valueOf()
    return Math.floor(dateVal + Math.random()*dateVal);
}

function getRandomValue(array) {
    let index = Math.floor(Math.random()*array.length)
    if (index === array.length) { index = 0}
    return array[index];
}

function setSvgActive(icon, active) {
    if (active) {
        icon.classList.remove("inactive-svg")
        icon.classList.add("active-svg")
    } else {
        icon.classList.add("inactive-svg")
        icon.classList.remove("active-svg")
    }
}

document.addEventListener('keydown', saveKeyPressed);
document.addEventListener('keyup', processEvent);
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
import { initializeBackend, getCollections, getLatLon, sendSocketMessage } from './backendApiManager.js';

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

let now = new Date();
let shaderOverride = getTime()

const pos = await getLatLon();
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
const landcape = new PIXI.Sprite();
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
- light shaders
- random animations
*/

// UI elements
const musicIcon = document.querySelector("#music-icon");
const ambianceIcon = document.querySelector("#ambiance-icon");
const sideBar = document.querySelector('.side-bar');
sideBar.onclick = (event) => {
    const validTarget = (event.target == sideBar ||
                         event.target == ambianceIcon ||
                         event.target == musicIcon);
    if (validTarget && sideBar.classList.contains('collapse')) {
        sideBar.classList.toggle('collapse');
        hideOnClickOutside(sideBar);
    }
};
musicIcon.onclick = sideBar.onclick;
ambianceIcon.onclick = sideBar.onclick;

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
const timeOfDayTooltip = document.getElementById("time-of-day-tooltip");

timeOfDaySlider.oninput = () => {
    const percent = timeOfDaySlider.value/timeOfDaySlider.max;
    shaderOverride = getTime(percent);
    if (percent > 0.9) {
        timeOfDayTooltip.style.removeProperty("left");
        timeOfDayTooltip.style.right = `${(1-percent)*100}%`;
    } else {
        timeOfDayTooltip.style.removeProperty("right");
        timeOfDayTooltip.style.left = `${percent*100}%`;
    }
    timeOfDayTooltip.innerHTML = shaderOverride.toLocaleTimeString();
    updateShaderInfo(shaderOverride);
}

const timeOfDayButton = document.querySelector("#time-of-day");
const timeOfDayCheckbox = document.querySelector("#time-of-day-checkbox");
const timeOfDayIcon = document.querySelector("#time-of-day-icon");
timeOfDayCheckbox.checked = getConfigProperty("dynamicTimeOfDay");
timeOfDayButton.onclick = (event) => {
    // This is to avoid double processing onclick, which happens
    // because the span and checkbox are on top of each other.
    event.preventDefault();
    timeOfDayCheckbox.checked = !timeOfDayCheckbox.checked;
    toggleTimeOfDay(timeOfDayCheckbox.checked);
    if (timeOfDayCheckbox.checked) {
        timeOfDayIcon.classList.remove("inactive-svg")
        timeOfDayIcon.classList.add("active-svg")
    } else {
        timeOfDayIcon.classList.add("inactive-svg")
        timeOfDayIcon.classList.remove("active-svg")
    }
    updateConfig({dynamicTimeOfDay: timeOfDayCheckbox.checked});
}

function toggleTimeOfDay(timeOfDayOn) {
    if (timeOfDayOn) {
        timeOfDaySlider.disabled = true;
        timeOfDaySlider.classList.toggle("hidden")
    } else {
        timeOfDaySlider.disabled = false;
        timeOfDaySlider.classList.toggle("hidden")
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
    if (audioFiltersCheckbox.checked) {
        reenableEffects(scenes[sceneIndex]);
        audioFiltersIcon.classList.remove("inactive-svg")
        audioFiltersIcon.classList.add("active-svg")
    } else {
        disableEffects();
        audioFiltersIcon.classList.add("inactive-svg")
        audioFiltersIcon.classList.remove("active-svg")
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

const musicSlider = document.querySelector("#music");
musicSlider.value = getConfigProperty("streamVolume");
musicSlider.oninput = () => {
    const volPercent = musicSlider.value/100;
    updateConfig({streamVolume: musicSlider.value});
    setCurrentlyPlayingStreamVolume(scenes[sceneIndex].stream.volume*volPercent, isChromium);
}

const ambianceSlider = document.querySelector("#ambiance");
ambianceSlider.value = getConfigProperty("ambianceVolume");
ambianceSlider.oninput = () => {
    const volPercent = ambianceSlider.value/100;
    updateConfig({ambianceVolume: ambianceSlider.value});
    scenes[sceneIndex].sounds.forEach(sound => {
        setCurrentlyPlayingSoundVolume(scenes[sceneIndex].sounds, sound.volume*volPercent);
    });
}

// The `load` method loads the queue of resources, and calls the passed in callback called once all
// resources have loaded.
loader.load((_, resources) => {
    // set the anchor point so the texture is centered on the sprite
    landcape.anchor.set(0.5);
    landcape.filters = [foregroundDayNightShader]
    landcape.texture = loader.resources[scenes[sceneIndex].image].texture;
    horizonY = scenes[sceneIndex].horizonY;

    // pass 2 colors and X coordinate for shading
    backgroundShader = new PIXI.Shader.from(null, skyDayNightShaderRaw, {
        color1: backgroundColor1,
        color2: backgroundColor2,
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
    midgroundSprites.addChild(landcape);
    background.position.set(0, 0);
    playSceneAudio();
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
    let oldHour = now.getHours();
    now = new Date();
    let curHour = now.getHours();
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

    if (landcape){
        landcape.position.set(window.innerWidth/(window.devicePixelRatio*2), window.innerHeight/(window.devicePixelRatio*2));
        if (landcape.height > 1) {
            landcape.height = Math.floor(app.screen.height/window.devicePixelRatio);
            landcape.width = Math.floor(app.screen.width/window.devicePixelRatio);
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
        foregroundDayNightShader.uniforms.color = info.foreground.color
        foregroundDayNightShader.uniforms.con_sat_brt = info.foreground.con_sat_brt
        cloudDayNightShader.uniforms.color = info.clouds.color
        cloudDayNightShader.uniforms.con_sat_brt = info.clouds.con_sat_brt
        backgroundShader.uniforms.color1 = info.sky.color1
        backgroundShader.uniforms.color2 = info.sky.color2
    }
}

function getTime(percentage = 0) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(today.getTime() + percentage * 24 * 60 * 60 * 1000);
}

function showTimeDisplay(time) {
    timeDisplay.innerHTML = time.toLocaleTimeString();
}

function loadTextures(scenes) {
    const addedTextures = new Set();
    scenes.forEach((scene) => {
        if (!addedTextures.has(scene.image)) {
            addedTextures.add(scene.image)
            loader.add(scene.image, scene.image)
        }
        if (scene.animations && scene.animations.length > 0) {
            scene.animations.forEach((animation) => {
                if (! addedTextures.has(animation.image)) {
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
            landcape.texture = loader.resources[scenes[sceneIndex].image].texture;
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
    await playStream(scenes[sceneIndex].stream.url, getConfigProperty("streamVolume"), scenes[sceneIndex].stream.effects, isChromium)
    await playSounds(scenes[sceneIndex].sounds, getConfigProperty("ambianceVolume"));
    sendSocketMessage(scenes[sceneIndex].stream.url);
}

function isSceneMeaningfullyDifferent(prevSceneIndex, curSceneIndex) {
    return scenes[curSceneIndex].image != scenes[prevSceneIndex].image ||
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

document.addEventListener('keydown', saveKeyPressed);
document.addEventListener('keyup', processEvent);
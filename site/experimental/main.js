import { getShaderInfo } from './shaderUtils.js';

/*
TODO LIST:
- make your own pixel landscape
- add sprites with random animations
- merge the 2 code bases
- add weather effects to the shaders
- make more scenes

For mini window:
- spec out screen
- build enclosure
- have diffused LEDs for physical elements
- diorama-ify enclosure
- write weather/time of day responsive LED code
*/

const foregroundDayNightShaderRaw = document.getElementById("foregroundDayNightShader").innerHTML;
const skyDayNightShader = document.getElementById("skyDayNightShader").innerHTML;
const timeDisplay = document.getElementById("time");
const horizonPercent = 0.5;

let now = new Date(Date.now());
setTime();

var sunInfo;
setSunInfo();

function setSunInfo() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((resp) => {
            // SOME GOOFY BEHAVIOR HERE PROBABLY FOR DAYLIGHT SAVINGS??
            let tmp = now
            tmp.setHours(tmp.getHours() + 12)
            sunInfo = SunCalc.getTimes(tmp, resp.coords.latitude,resp.coords.longitude)
        });
    }
}

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.SORTABLE_CHILDREN = true;
const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight,
    autoResize: true, backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1, sharedTicker: true
});
const SPRITE_LIMIT = 30;
const spritePool = []

document.getElementById("body").appendChild(app.view);

// Shaders
var curShaderInfo = getShaderInfo(now, sunInfo)
const foregroundDayNightShader = new PIXI.Filter(null, foregroundDayNightShaderRaw, curShaderInfo.foreground);
const cloudDayNightShader = new PIXI.Filter(null, foregroundDayNightShaderRaw, curShaderInfo.clouds);

// Sprites
let foreground;
let cloudTextures = []

const loader = PIXI.Loader.shared;
loader.add('waterfall', '../assets/pixel-landscape.png')
const numClouds = 4;
for (let i = 1; i <= numClouds; i++) {
    loader.add(`cloud${i}`,`../assets/cloud${i}.png`)
}

// background
const backgroundColor1 = [0, 1/255, 26/255]
const backgroundColor2 = [4/255, 7/255, 48/255]
const quadPos = new Float32Array([0, 0, window.innerWidth, 0, window.innerWidth, window.innerHeight, 0, window.innerHeight]);
const quadUvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

const quadGeometry = new PIXI.Geometry()
    .addAttribute('aVertexPosition', quadPos, 2)
    .addAttribute('aTextureCoord', quadUvs, 2)
    .addIndex([0, 1, 2, 0, 2, 3]);
let background;
let backgroundShader;

const backgroundSprites = new PIXI.Container();
const midgroundSprites = new PIXI.Container();
const foregroundSprites = new PIXI.Container();

// The `load` method loads the queue of resources, and calls the passed in callback called once all
// resources have loaded.
loader.load((_, resources) => {
    foreground = new PIXI.Sprite(resources['waterfall'].texture);
    for (let i = 1; i <= numClouds; i++) {
        const cloudName = `cloud${i}`
        cloudTextures.push(resources[cloudName].texture)
    }
    
    // set the anchor point so the texture is centered on the sprite
    foreground.anchor.set(0.5);
    foreground.filters = [foregroundDayNightShader]
    
    // pass 2 colors and X coordinate for shading
    backgroundShader = new PIXI.Shader.from(null, skyDayNightShader, {
        color1: backgroundColor1,
        color2: backgroundColor2,
        resolution: [window.innerWidth*window.devicePixelRatio, window.innerHeight*window.devicePixelRatio],
        bottomColorStart: 0.8
    })
    for (let i = 0; i < SPRITE_LIMIT; i++) {
        spritePool.push(new PIXI.Sprite());
        app.stage.addChild(spritePool[spritePool.length-1])
    }
    background = new PIXI.Mesh(quadGeometry, backgroundShader);
    app.stage.addChild(background);
    app.stage.addChild(backgroundSprites);
    app.stage.addChild(midgroundSprites);
    app.stage.addChild(foregroundSprites);
    midgroundSprites.addChild(foreground);
    background.position.set(0, 0);
    resize();
    document.getElementById("loading").classList.add("hide-opacity");
});

requestAnimationFrame(animate);

function animate()
{
    processClouds();

    // time to render the stage !
    app.renderer.render(app.stage);

    // request another animation frame...
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);

// Resize function window
function resize() {
    // Resize the renderer
    app.renderer.resize(window.innerWidth, window.innerHeight);

    // You can use the 'screen' property as the renderer visible
    // area, this is more useful than view.width/height because
    // it handles resolution
    if (foreground){
        foreground.position.set(window.innerWidth/(window.devicePixelRatio*2), window.innerHeight/(window.devicePixelRatio*2));
        if (foreground.height > 1) {
            foreground.height = Math.floor(app.screen.height/window.devicePixelRatio);
            foreground.width = Math.floor((app.screen.height * foreground._texture.orig.width/foreground._texture.orig.height)/window.devicePixelRatio);
        }
    }
    if (backgroundShader) {
        backgroundShader.uniforms.resolution = [window.innerWidth*window.devicePixelRatio, window.innerHeight*window.devicePixelRatio]
    }
}

var slider = document.getElementById("dayslider");



slider.oninput = function() {
    setTime(this.value/slider.max);
    // TODO: update this to return color information for the sky
    let info = getShaderInfo(now, sunInfo)
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

function setTime(percentage = 0) {
    var today = new Date(Date.now());
    today.setHours(0, 0, 0, 0);

    now = new Date(today.getTime() + percentage * 24 * 60 * 60 * 1000);
    timeDisplay.innerHTML = now.toLocaleTimeString();
    timeDisplay.style.opacity = 1
}

const cloudChance = 0.2;
const maxClouds = 15;
let onScreenClouds = [];
let cloudSpeed = 90; // represents time on screen
let createCloud = false;
setInterval(() => {
    if (onScreenClouds.length != maxClouds && Math.random() < cloudChance) {
        createCloud = true;
    }
}, 1000)

function processClouds() {
    let xMove = app.screen.width/(cloudSpeed * app.ticker.FPS);
    onScreenClouds.forEach(cloud => {
        cloud.position.set(cloud.position.x + xMove, cloud.position.y);
    });

    onScreenClouds.filter(cloud => isSpriteDoneScrolling(cloud, true)).forEach(cloud => {
        cloud.parent.removeChild(cloud);
        cloud.filters = []
        spritePool.push(cloud);
    });

    onScreenClouds = onScreenClouds.filter(cloud => !isSpriteDoneScrolling(cloud, true));

    if (onScreenClouds.length == maxClouds) {
        return;
    }

    if (createCloud) {
        let newCloud = spritePool.pop();
        if (newCloud) {
            let texPos = Math.floor(Math.random() * cloudTextures.length);
            newCloud.texture = cloudTextures[texPos];
            let rand = Math.random();
            let yPos = rand * horizonPercent * app.screen.height/window.devicePixelRatio - newCloud.height/2;
            const sizeMod = 1.1 - rand;
            newCloud.width = Math.floor(newCloud._texture.baseTexture.width * sizeMod);
            newCloud.height = Math.floor(newCloud._texture.baseTexture.height * sizeMod);
            newCloud.position.set(0 - newCloud.width, yPos);
            newCloud.filters = [cloudDayNightShader];
            if (rand > 0.5) {
                backgroundSprites.addChild(newCloud);
            } else {
                midgroundSprites.addChild(newCloud);
            }
            onScreenClouds.push(newCloud);
            createCloud = false;
        }
    }
}

function isSpriteDoneScrolling(sprite, scrollingRight = true) {
    if (scrollingRight) {
        return (sprite.position.x - sprite.width) >= (window.innerWidth/window.devicePixelRatio)
    }
    return (sprite.position.x + sprite.width) <= 0
}
const pixelatedShaderRaw = document.getElementById("pixelatedShader").innerHTML;
const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight,
    autoResize: true, backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1, sharedTicker: true
});
var slider = document.getElementById("dayslider");

document.getElementById("body").appendChild(app.view);

// Sprites
let carHouse;

const loader = PIXI.Loader.shared;
loader.add('carhouse', './carhouse.jpg')

//housewithcar coords
const carhouseCoords = {
    y: 0.60,
    x: 0.43,
    width: 0.05,
    height: 0.05,
    dimensions: {
        type: "v2",
        value: [1000, 1000]
    },
    strength: slider.min
}

const vert = `
attribute vec2 aVertexPosition;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;
varying vec2 vFilterCoord;

uniform vec4 inputSize;
uniform vec4 outputFrame;

vec4 filterVertexPosition( void )
{
    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;

    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aVertexPosition * (outputFrame.zw * inputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
    vFilterCoord =  vTextureCoord * inputSize.xy / outputFrame.zw;
}
`

const pixelatedShader = new PIXI.Filter(vert, pixelatedShaderRaw, carhouseCoords);

slider.oninput = function() {
    pixelatedShader.uniforms.strength = this.value;
}

// The `load` method loads the queue of resources, and calls the passed in callback called once all
// resources have loaded.
loader.load((_, resources) => {
    carHouse = new PIXI.Sprite(resources['carhouse'].texture);

    // set the anchor point so the texture is centered on the sprite
    carHouse.anchor.set(0.5);
    carHouse.filters = [pixelatedShader]
    
    app.stage.addChild(carHouse);
    
    resize();
});

window.addEventListener('resize', resize);

// Resize function window
function resize() {
    // Resize the renderer
    app.renderer.resize(window.innerWidth, window.innerHeight);

    if (carHouse){
        carHouse.position.set(window.innerWidth/(window.devicePixelRatio*2), window.innerHeight/(window.devicePixelRatio*2));
        if (carHouse.height > 1) {
            carHouse.height = Math.floor(app.screen.height/window.devicePixelRatio);
            carHouse.width = Math.floor((app.screen.height * carHouse._texture.orig.width/carHouse._texture.orig.height)/window.devicePixelRatio);
        }
    }
}

requestAnimationFrame(animate);

function animate()
{    // time to render the stage !
    app.renderer.render(app.stage);

    // request another animation frame...
    requestAnimationFrame(animate);
}



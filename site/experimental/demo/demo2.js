const pixelatedShaderRaw = document.getElementById("pixelatedShader").innerHTML;
const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight,
    autoResize: true, backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1, sharedTicker: true
});
var slider = document.getElementById("dayslider");

document.getElementById("body").appendChild(app.view);

//carhouse coords
const carhouseCoords = {
    y: 0.23,
    x: 0.43,
    width: 0.05,
    height: 0.05,
    strength: slider.min
}

const vertShader = `
attribute vec2 aVertexPosition;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

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
}
`

const pixelatedShader = new PIXI.Filter(vertShader, pixelatedShaderRaw, carhouseCoords);
var texture = PIXI.Texture.from( document.getElementById( "carHouse" ) );
const carHouse = new PIXI.Sprite(texture);

// set the anchor point so the texture is centered on the sprite
carHouse.anchor.set(0.5);
carHouse.filters = [pixelatedShader]

app.stage.addChild(carHouse);
resize();

slider.oninput = function() {
    pixelatedShader.uniforms.strength = this.value;
}

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


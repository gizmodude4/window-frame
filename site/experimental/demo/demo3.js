const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight,
    autoResize: true, backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1, sharedTicker: true
});
document.getElementById("body").appendChild(app.view);

const fragment = `
varying vec2 vTextureCoord;

uniform vec2 size;
uniform sampler2D uSampler, backdropSampler;
uniform vec2 backdropSampler_flipY;
uniform highp vec4 inputSize;
uniform highp vec4 outputFrame;

vec2 mapCoord( vec2 coord )
{
    return coord * inputSize.xy + outputFrame.xy;
}

vec2 unmapCoord( vec2 coord )
{
    return (coord - outputFrame.xy) * inputSize.zw;
}

vec2 pixelate(vec2 coord, vec2 size)
{
    return floor( coord / size ) * size;
}

void main(void)
{
    vec2 coord = mapCoord(vTextureCoord);
    coord = pixelate(coord, size);
    coord = unmapCoord(coord);
    // required to take backdrop from screen without extra drawcall
    coord.y = coord.y * backdropSampler_flipY.y + backdropSampler_flipY.x;

    vec4 color = texture2D(backdropSampler, coord);
    vec4 multiplier = texture2D(uSampler, vTextureCoord);

    gl_FragColor = color * multiplier.a;
}`;

class PixelateFilter extends PIXI.Filter {
    constructor(size = 10, baseTexture) {
        super(undefined, fragment, {
            backdropSampler: PIXI.Texture.WHITE.baseTexture,
            uBackdrop_flipY: new Float32Array(2),
            size: new Float32Array(2),
        });
        this.size = size;
        this.backdropUniformName = 'backdropSampler';
    }

    get size() {
        return this.uniforms.size;
    }

    set size(value) {
        if (typeof value === 'number') {
            value = [value, value];
        }
        this.uniforms.size = value;
    }
}

app.loader.add('./carhouse.jpg').add('../../assets/deer.png').load(complete);

function complete(_, resources)  {
// create a new background sprite
    const background = new PIXI.Sprite(resources['./carhouse.jpg'].texture);
    app.stage.addChild(background);

    const dude = new PIXI.Sprite(resources['../../assets/deer.png'].texture);
    dude.position.set(100);
    dude.filters = [new PixelateFilter(10, resources['./carhouse.jpg'].texture)];
    app.stage.addChild(dude);
}
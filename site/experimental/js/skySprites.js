const maxSprites = 15;
let onScreenSprites = [];
const spriteConfig = {};

export function resetSkySprites(spritePool) {
    for (let i = 0; i < onScreenSprites.length; i++) {
        if (onScreenSprites[i].parent) {
            onScreenSprites[i].parent.removeChild(onScreenSprites[i])
        }
        onScreenSprites[i].filters = [];
        spritePool.push(onScreenSprites[i]);
    }

    onScreenSprites = []
}

export function processSkySprites(app, spritePool) {
    onScreenSprites.forEach(skySprite => {
        let xMove = app.screen.width/(spriteConfig[skySprite.id].movement.duration * app.ticker.FPS)
        xMove = spriteConfig[skySprite.id].movement.direction != "LEFT" ? xMove : xMove*-1;
        skySprite.position.set(skySprite.position.x + xMove, skySprite.position.y);
    });

    onScreenSprites.filter(skySprite => isSpriteDoneScrolling(skySprite, spriteConfig[skySprite.id].direction != "LEFT")).forEach(skySprite => {
        if (skySprite.parent) {
            skySprite.parent.removeChild(skySprite);
        }
        skySprite.filters = []
        spritePool.push(skySprite);
    });

    onScreenSprites = onScreenSprites.filter(skySprite => !isSpriteDoneScrolling(skySprite, spriteConfig[skySprite.id].direction != "LEFT"));
}

export function addSkySprite(texture, posY, movement, screenWidth, sizeMod, spriteLayer, spritePool, shader) {
    if (onScreenSprites.length < maxSprites && spritePool.length > 0) {
        console.log("getting a new sprite");
        const newSprite = spritePool.pop();
        if (newSprite.x < (window.innerWidth/window.devicePixelRatio) && newSprite.x > 0) {
            console.log("WEEWOO, we got one that's currently on screen");
            console.log(`${newSprite.x} ${newSprite.y}`)
        }
        if (sizeMod < 0.1) {
            sizeMod = 0.1;
        }
        if (newSprite) {
            spriteConfig[newSprite.id] = {
                movement,
                sizeMod
            };
            newSprite.texture = texture;
            const yPos = posY - newSprite.height/2;
            newSprite.width = Math.floor(newSprite._texture.baseTexture.width * sizeMod);
            newSprite.height = Math.floor(newSprite._texture.baseTexture.height * sizeMod);
            const xPos = movement.direction != "LEFT" ? 0 - newSprite.width : screenWidth + newSprite.width
            newSprite.position.set(xPos, yPos);
            newSprite.filters = [shader];
            spriteLayer.addChild(newSprite)
            onScreenSprites.push(newSprite);
        }
    }
}

export function resizeSkySprites(widthDiff, heightDiff, initialWidthDiff, initialHeightDiff) {
    onScreenSprites.forEach(skySprite => {
        skySprite.x = widthDiff * skySprite.x;
        skySprite.y = heightDiff * skySprite.y;
        skySprite.width = Math.round(spriteConfig[skySprite.id].sizeMod * skySprite._texture.baseTexture.width * initialWidthDiff);
        skySprite.height = Math.round(spriteConfig[skySprite.id].sizeMod * skySprite._texture.baseTexture.height * initialHeightDiff);
    });
}

function isSpriteDoneScrolling(sprite, scrollingRight = true) {
    if (scrollingRight) {
        return (sprite.position.x - sprite.width) >= (window.innerWidth/window.devicePixelRatio)
    }
    return (sprite.position.x + sprite.width) <= 0
}

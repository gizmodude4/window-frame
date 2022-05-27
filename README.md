# window-frame
window-frame is the software powering [Lazy Day Cafe](https://lazyday.cafe)

# Demo
To come.

## Current Linux Installation
- Git clone the repo
- Run `npm install` in the `node` directory
- Modify `window-frame.service` to point to the base directory of Node (I'm running it in root's home directory)
- Copy `window-frame.service` in to `/usr/lib/systemd`
- Run `systemctl start window-frame`
- To enable at startup, run `systemctl enable window-frame`
- If running on a Raspberry Pi on startup, create a user-specific systemd file that points to the `startup.sh` script in the `startup` directory.

## Running a local Icecast server
- Install liquidsoap, and Icecast from the applicable package manager.
- Create a symlink from your apache home directory to the `site` directory in this repo.
- Copy the `icecast.xml` file to the icecast installation folder
- Create a directory of all the music you want to play and update `liquidsoapconfig.liq` to point to that directory.
- To make sure the stream is up with the server, create systemd files for both liquidsoap and icecast.
- Modify `window-frame.service` to rely on those systemd files.

## Keyboard Shortcuts
- `s` will switch scenes

Currently, to build a scene, you need to build a big ol' JSON file like `v2-playlist.json`, which is fed in to the backend. Eventually, I'll add a lightweight tool to generate these and preview them, but for now, you're kind of flying blind in the text work, so good luck with that.

### Scene Construction
### Collections
Currently, collections are just a collection of scenes of one type -- STATIC. In the future, support will be added for a SCHEDULED collection, namely one that switch stream audio or scenes based on the current time. The idea behind this is the vibes you want at 11AM are probably very different than the ones you want at 11PM. Collections look like this:

```json
{
    "collections": [
        "collectionType": "STATIC",
        "scenes": [
            {}
        ]
    ]
}
```

#### Scenes
Scenes are comprised of a link to the admin URL on liquidsoap if running Icecast locally (used for track switching), the stream URL, stream volume, an ID, the horizon line, any random animations, and sounds with their effects. The structure for a scene looks like this:

```json
{
    "id": "peaceful-valley",
    "name": "Peaceful Valley",
    "image": "assets/peaceful-valley.png",
    "horizonY": 0.25,
    "animations": [
    {
        "spawnChance": 0.10,
        "backgroundChance": 0.5,
        "image": "assets/cloud-1.png",
        "sizeMod": 0.9,
        "movement": {
        "duration": 90,
        "direction": "RIGHT"
        }
    },
    {
        "spawnChance": 0.10,
        "backgroundChance": 0.5,
        "image": "assets/cloud-1.png",
        "sizeMod": 0.9,
        "movement": {
        "duration": 120,
        "direction": "RIGHT"
        }
    },
    {
        "spawnChance": 0.10,
        "backgroundChance": 0.9,
        "image": "assets/cloud-3.png",
        "sizeMod": 0.5,
        "movement": {
        "duration": 90,
        "direction": "RIGHT"
        }
    }
    ],
    "stream": {
    "url": "http://usa9.fastcast4u.com/proxy/jamz?mp=/1",
    "volume": 30,
    "effects": [
        {
        "effectType": "hpf",
        "config": {
            "frequency": 200
        }
        }
    ]
    },
    "sounds": [
    {
        "url": "assets/songs/valley.wav",
        "volume": 50,
        "loop": true
    },
    {
        "url": "assets/songs/quiet-street-noises.mp3",
        "volume": 20,
        "loop": true,
        "effects": [
        {
            "effectType": "reverb",
            "config": {
            "time": 2.65,
            "decay": 3,
            "mix": 0.85
            }
        }
        ]
    }
    ]
}
```

#### Effects
Effects live inside the `audioEffects` array in both Atmosphere audio and scenes. They have the same structure of just an `effectType` and a `config`. Currently, the only supported audio effects are high pass filter (`hpf`), low pass filter (`lpf`), and reverb (`reverb`), though any effect defined by [Pizzicato.js](https://github.com/alemangui/pizzicato) will also work, provided you update `audioManager.js` to handle the label you pass in. Similarly, the configs you should provide are defined by Pizzicato.

#### Pizzicato
Pizzicato is the libary used in this project to modify audio on the fly. Unfortunately, it's no longer updated and this project demanded the use of audio capturing via the audio media element, which I've added. As a result, Pizzicato is included in its entirety in this repo, plus the changes.
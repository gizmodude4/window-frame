# window-frame
Digital Window Frame software for Raspberry Pi

# Demo
I did a YouTube video showing off what this can do here: https://www.youtube.com/watch?v=3YfQFlvKxRY

## Current Windows Installation
- Install `windows-service.js` using `node-windows`, an npm downloadable library to run the Node.JS server on startup
- Install AutoFullscreen extension for Firefox
- Install Apache (currently in `C:\Apache24`) and copy `../site` files to the `htdocs` directory. Probably should have symlinked
- Installed Node/Python/Visual Studio (for initial installation)
    - Uninstalled all of Visual Studio afterward
- Installed PC Remote on Android phone and PC Remote Server on system
    - Security issues?

## Current Linux Installation
- Install liquidsoap, icecast, NodeJS, and Apache using whatever package manager you'd like.
- Create a symlink from your apache home directory to the `site` directory in this repo.
- Copy the `icecast.xml` file to the icecast installation folder
- Create a directory of all the music you want to play and update `liquidsoapconfig.liq` to point to that directory
- Create systemd installation file to open icecast, then liquidsoap (pass in the `liquidsoapconfig.liq` file as a parameter), then NodeJS (`node server.js --config playlist.json`), then the startup script in the startup directory (in that order) on startup.
    - The startup script should be a user-specific systemd file

## How to Use the Window Frame
The actual display is just a web browser window (Chromium on Raspberry Pi and Firefox on Windows) that accepts keyboard commands (which is what the arcade button controller is doing on the mounted one.) The commands are as follows
- `s` will switch scenes
- `e` will switch atmospheres
- `m` will switch tracks (takes somewhere between 6-10 seconds b/c of some goofiness with liquidsoap and icecast)

Currently, to build a scene, you need to build a big ol' JSON file like `playlist.json`, which is fed in to the . Eventually, I'll add a lightweight tool to generate these and preview them, but for now, you're kind of flying blind in the text work, so good luck with that.

### Scene and Atmosphere Construction
#### Scenes
Scenes are comprised of a link to the admin URL on liquidsoap (used for track switching), the stream URL, stream volume, an ID, any number of effects you want on the stream, and a number of atmospheres. The structure for a scene looks like this:

```json
{
  "id": "cyberpunk-cafe",
  "audioEffects": [
      {
          "effectType": "lpf",
          "config": {
              "frequency": 15000
          }
      },
      {
          "effectType": "reverb",
          "config": {
              "time": 1.63,
              "decay": 2,
              "mix": 0.5
          }
      }
  ],
  "stream": "http://localhost:8002/stream",
  "streamVolume": 40,
  "admin": "http://localhost:8005",
  "atmosphere": [
      ...
  ]
}
```
#### Atmospheres
Scenes have a number of atmospheres and each atmosphere can override the playlist volume, define its own sound effects, and each of those sound effects can have their own filters. The structure for at atmosphere looks like this:

```json
{
    "streamVolume": 80,
    "name": "Roast in the Shell (ear buds in)",
    "image": "assets/cyberpunk-cafe.gif",
    "audio": [
        {
            "link": "assets/songs/cafe.mp3",
            "volume": 100,
            "loop": true,
            "audioEffects": [
                {
                    "effectType": "lpf",
                    "config": {
                        "frequency": 500
                    }
                }
            ]
        }
    ]
}
```

#### Effects
Effects live inside the `audioEffects` array in both Atmosphere audio and scenes. They have the same structure of just an `effectType` and a `config`. Currently, the only supported audio effects are high pass filter (`hpf`), low pass filter (`lpf`), and reverb (`reverb`), though any effect defined by [Pizzicato.js](https://github.com/alemangui/pizzicato) will also work, provided you update `AudioEffectCreator.js` to handle the label you pass in. Similarly, the configs you should provide are defined by Pizzicato.

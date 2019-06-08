# py-window-frame
Window frame software for Raspberry Pi

## Current Windows Installation
- Install `windows-service.js` using `node-windows`, an npm downloadable library to run the Node.JS server on startup
- Install AutoFullscreen extension for Firefox
- Install Apache (currently in `C:\Apache24`) and copy `../site` files to the `htdocs` directory. Probably should have symlinked
- Installed Node/Python/Visual Studio (for initial installation)
    - Uninstalled all of Visual Studio afterward
- Installed PC Remote on Android phone and PC Remote Server on system
    - Security issues?

## Future Works
- Try a Linux installation
- Refactor code to do all audio processing on back end, then stream to front end.
    - This refactoring, while difficult, would make the project much more extensible and would be more technically correct (front end just displaying while back end does the heavy lifting)
    - Back end streaming could also make integrating with streaming services easier, albeit at the potential expense of the ambiance engine.
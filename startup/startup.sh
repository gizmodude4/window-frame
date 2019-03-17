#!/bin/bash
xset s noblank
xset s off
xset -dpms
if [ ! -L "/var/www/html/main.html" ]
then
  ln -s /home/pi/window-frame/js/site/main.html /var/www/html/main.html
fi
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/pi/.config/chromium/Default/Preferences
node ~/window-frame/js/node/server.js --config ~/window-frame/js/node/playlist.json &
/usr/bin/chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost/main.html &
#!/bin/bash
xset s noblank
xset s off
xset -dpms
if [ ! -L "/var/www/html/main.html" ]
then
  sudo cp -r /home/pi/window-frame/site/* /var/www/html/
fi
if [ ! -L "/lib/systemd/system/windowframe.service" ]
then
  sudo cp /home/pi/window-frame/startup/windowframe.service /lib/systemd/system
fi
#unclutter -idle 0.5 -root &
unclutter -display :0 -noevents -grab &
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/pi/.config/chromium/Default/Preferences
node /home/pi/window-frame/node/server.js --config /home/pi/window-frame/node/playlist.json
#sleep 5
#/usr/bin/chromium-browser --start-maximized --noerrdialogs --disable-infobars --kiosk http://localhost/main.html &

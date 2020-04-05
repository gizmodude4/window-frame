#!/bin/bash
xset s noblank
xset s off
xset -dpms
unclutter -idle 0.5 -root &
#unclutter -display :0 -noevents -grab &
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/pi/.config/chromium/Default/Preferences
/usr/bin/chromium-browser --start-maximized --noerrdialogs --disable-infobars --kiosk http://localhost/main.html

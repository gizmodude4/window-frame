var Service = require('node-windows').Service;

var directory = "C:\\Users\\Window\\window-frame\\node\\";

// Create a new service object
var svc = new Service({
  name:'Window Frame',
  description: 'The nodejs server for Window Frame.',
  script: directory + 'server.js',
  env: [{
    name: "CONFIG",
    value: directory + "playlist.json"
  }],
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();
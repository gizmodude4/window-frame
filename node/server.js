import axios from 'axios';
import { WebSocketServer } from 'ws';
import geoip from 'geoip-lite';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import cors from 'cors';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import isvalid from 'isvalid';
import Parser from 'icecast-parser';
import minimist from 'minimist';

var configPath;
var args = minimist(process.argv.slice(2));

if (args['config']) {
  configPath = args['config'];
}

if (process.env.CONFIG) {
  if (configPath) {
    console.log("Environment variable overridden by command line config");
  } else {
    configPath = process.env.CONFIG;
  }
}

if (!configPath) {
  throw new Error('Must provide config file either with environment variable or command line argument');
}

dotenv.config();

const APP_PORT = 8080;
const DEPLOYED = process.env.DEPLOYED;

/////////////////////////// Set Up Server ///////////////////////////
const whitelist = ['https://lazyday.cafe']
if (!DEPLOYED) {
  whitelist.push('http://localhost:8000');
}

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.error(`Invalid origin ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  }
}

const app = express();
app.use(cors(corsOptions));
let server;
if (DEPLOYED) {
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/backend.lazyday.cafe/privkey.pem');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/backend.lazyday.cafe/fullchain.pem');

  const credentials = { key: privateKey, cert: certificate };
  server = https.createServer(credentials, app);
  server.listen(443);
} else {
  server = http.createServer(app);
  server.listen(APP_PORT);
}

// TODO: CHANGE THIS TO SOCKET.IO
var socketConnections = {};
var curStreamMeta = {};

const wss = new WebSocketServer({ server: server });

const activeTickets = {};
const TICKET_EXPIRATION = 60 * 1000;

const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));

isvalid(configFile, {
  'collections': {
    type: Array, len: '1-', required: true, schema: {
      'collectionType': { type: String, required: true },
      'scenes': {
        type: Array, len: '1-', required: true, schema: {
          'id': { type: String, required: true },
          'name': { type: String, required: true },
          'image': { type: String, required: true },
          'horizonY': { type: Number, required: true },
          'endTime': { type: String, required: false },
          'animations': {
            type: Array, required: false, schema: {
              'spawnChance': { type: Number, required: true },
              'backgroundChance': { type: Number, required: true },
              'image': { type: String, required: true },
              'sizeMod': { type: Number, required: true },
              'movement': {
                type: Object, required: false, schema: {
                  'duration': { type: Number, required: true },
                  'direction': { type: String, required: true }
                }
              }
            }
          },
          'stream': {
            type: Object, required: true, schema: {
              'url': { type: String, required: true },
              'admin': { type: String, required: false },
              'volume': { type: Number, required: true },
              'effects': {
                type: Array, required: false, schema: {
                  'effectType': { type: String, required: true },
                  'config': { type: Object, required: true, unknownKeys: 'allow' },
                }
              },
            }
          },
          'sounds': {
            type: Array, required: false, schema: {
              'url': { type: String, required: true },
              'volume': { type: Number, required: true },
              'loop': { type: Boolean, required: false},
              'effects': {
                type: Array, required: false, schema: {
                  'effectType': { type: String, required: true },
                  'config': { type: Object, required: true, unknownKeys: 'allow' },
                }
              },
            }
          },
        }
      }
    }
  },
})
.then(setUpServer)
.catch((err) => {
  throw new Error('Error parsing config: ' + err.message);
});


function setUpServer(config) {
  // Stream metadata
  config.collections.forEach((collection) => {
    collection.scenes.forEach((scene) => {
      socketConnections[scene.stream.url] = {};
      if (!(scene.stream.url in curStreamMeta)) {
        curStreamMeta[scene.stream.url] = undefined;
        provisionIcecastParser(scene.stream.url);
      }
    });
  });

  app.get('/scenes', function (req, res) {
    res.send(config.collections);
  });

  app.get('/location', function(req, res) {
    const fullIp = req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                null;
    const ipv4 = fullIp.replace(/^.*:/, '');
    if (!ipv4) {
      res.send(null);
      return;
    }
    res.send(geoip.lookup(ipv4));
  });

  app.put('/scenes/:sceneId/skip', async function (req, res) {
    var sceneId = req.params.sceneId;
    var foundSeen = undefined;
    config['scenes'].forEach(function (scene) {
      if (scene.id = sceneId) {
        foundSeen = scene;
      }
    })
    if (!foundSeen) {
      res.status(404).send("No scene with ID " + sceneId + " found");
    } else {
      var adminUrl = foundSeen.admin;
      axios.put(adminUrl + "/skip").then((response) => {
        res.sendStatus(response.statusCode)
      });
    }
  });

  app.get('/ticket', (req, res) => {
    const origin = req.get('origin');
    const ticket = generateTicket(origin);
    res.send({ticket:ticket})
  })

  wss.on('connection', (ws, request) => {
    const origin = getOriginFromHeaders(request.rawHeaders);
    if (whitelist.indexOf(origin) == -1) {
      console.log(`whitelist does not contain origin ${origin}`);
      ws.close();
      return;
    }
    if (!validateTicket(request.url, origin)) {
      console.log(`invalid ticket ${request.url} ${origin}`);
      ws.close();
      return;
    }
    ws.on('message', function (data, isBinary) {
      const message = isBinary ? data : data.toString();
      addToListeners(message, origin, ws);
      if (message in curStreamMeta && curStreamMeta[message]) {
        ws.send(curStreamMeta[message]);
      }
    });
    ws.on('close', function () {
      removeFromListeners(origin);
    });
  });
}

function provisionIcecastParser(streamUrl) {
  var parser = new Parser({
    url: streamUrl,
    emptyInterval: 60,
    errorInterval: 60,
    metadataInterval: 1
  });
  parser.on('metadata', function (metadata) {
    if (curStreamMeta[streamUrl] != metadata.StreamTitle) {
      curStreamMeta[streamUrl] = metadata.StreamTitle;
      sendMetadata(streamUrl, metadata.StreamTitle);
    }
  });
  parser.on('error', function (e) {
    console.log(e);
    console.error('An error happened connecting to ' + streamUrl + ' will try again soon...')
  })
}

function sendMetadata(streamUrl, metadata) {
  if (socketConnections[streamUrl]) {
    for (const origin in socketConnections[streamUrl]) {
      socketConnections[streamUrl][origin].send(metadata);
    }
  }
}

function addToListeners(streamUrl, origin, ws) {
  if (!Object.keys(curStreamMeta).includes(streamUrl)) {
    console.error('Could not find stream associated with stream URL ' + streamUrl);
  } else {
    socketConnections[streamUrl][origin] = ws;
  }
}

function removeFromListeners(origin) {
  for (const streamUrl in socketConnections) {
    if (Object.keys(socketConnections[streamUrl]).includes(origin)) {
      delete socketConnections[streamUrl][origin];
    }
  }
}

function getOriginFromHeaders(headers) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === "Origin") {
      return headers[i+1];
    }
  }
  return null;
}

function generateTicket(origin) {
  const ticket = crypto.randomBytes(20).toString('hex');
  activeTickets[ticket] = {
    origin: origin,
    expiration: Date.now() + TICKET_EXPIRATION
  };
  return ticket;
}

function validateTicket(url, origin) {
  console.log (`url: ${url}, origin: ${origin}`)
  const index = url.indexOf('ticket=');
  const submittedTicket = url.substring(index + 7);
  let foundTicket;
  for (let ticket in activeTickets) {
    if (ticket === submittedTicket &&
        activeTickets[ticket].origin === origin &&
        activeTickets[ticket].expiration > Date.now()) {
        foundTicket = ticket;
      break;
    }
  }
  if (foundTicket) {
    delete activeTickets[foundTicket]
    return true;
  }
  return false;
}

const ticketCleanup = setInterval(() => {
  const expiredTickets = [];
  Object.keys(activeTickets).forEach(ticket => {
    if (activeTickets[ticket].expiration < Date.now()) {
      expiredTickets.push(ticket);
    }
  })
  expiredTickets.forEach(ticket => delete activeTickets[ticket])
}, 1000);
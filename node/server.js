import axios from 'axios';
import geoip from 'geoip-lite';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import cors from 'cors';
import express, { json } from 'express';
import fs from 'fs';
import isvalid from 'isvalid';
import minimist from 'minimist';
import Parser from 'icecast-parser';

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
const CHILLHOP_PLAYLIST_URL = process.env.CHILLHOP_PLAYLIST_URL;
const CHILLHOP_MUSIC_URL = process.env.CHILLHOP_MUSIC_URL;
const LIQUIDSOAP_TRACK_URL = process.env.LIQUIDSOAP_TRACK_URL;

/////////////////////////// Set Up Server ///////////////////////////
const whitelist = ['https://lazyday.cafe']
if (!DEPLOYED) {
  whitelist.push('http://localhost:8000', undefined);
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
app.use(json());
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
          'nightLights': { type: String, required: false },
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

const parsers = {};
const curStreamMeta = {};

function setUpServer(config) {
  // Stream metadata
  config.collections.forEach((collection) => {
    collection.scenes.forEach((scene) => {
      if (!(scene.stream.url in curStreamMeta)) {
        curStreamMeta[scene.stream.url] = undefined;
        provisionIcecastParser(scene.stream.url);
      }
    });
  });

  app.get('/scenes', function (req, res) {
    res.send(config.collections);
  });

  app.get('/metadata', function(req, res) {
    const streamUrl = req.query.streamUrl;
    if (!(streamUrl in curStreamMeta)) {
      res.sendStatus(404);
      return;
    }
    res.send({
      "streamTitle": curStreamMeta[streamUrl]
    });
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
}

function provisionIcecastParser(streamUrl) {
  const parser = new Parser({
    url: streamUrl,
    emptyInterval: 60,
    errorInterval: 60,
    metadataInterval: 5,
    notifyOnChangeOnly: true
  });
  parser.on('metadata', function (metadata) {
    if (curStreamMeta[streamUrl] != metadata.StreamTitle) {
      curStreamMeta[streamUrl] = metadata.StreamTitle;
    }
  });
  parser.on('error', function (e) {
    console.error('An error happened connecting to ' + streamUrl + ' will try again soon...', e);
  });
  parsers[streamUrl] = parser;
}

if (CHILLHOP_PLAYLIST_URL) {
  const currentChillhopTracks = new Set();
  const chillhopUpdate = setInterval(async () => {
    axios.get(CHILLHOP_PLAYLIST_URL)
      .then((response) => {
        return Promise.all(response.data.map(song => {
          if (!(currentChillhopTracks.has(song.track_id))) {
            const request = `annotate:title="${song.title}",artist="${song.artists}":${CHILLHOP_MUSIC_URL}${song.fileID}`
            return axios.post(LIQUIDSOAP_TRACK_URL, request, { timeout: 10000 })
              .then(() => currentChillhopTracks.add(song.track_id))
              .catch((error) => {console.log(`error with ${song.track_id}`); console.error(error)});
          }
        }));
      })
      .catch((error) => { console.error("outer"); console.error(error)});
  }, 30000);
}
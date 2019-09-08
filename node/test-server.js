var express = require('express');
var fs = require('fs');
var stream = require('stream');
var echoStream = new stream.Duplex();
echoStream._write = function (chunk, encoding, done) {
  done(chunk, encoding);
};

echoStream._write = function (chunk, encoding, done) {
  done(chunk, encoding);
};


const inoutStream = new stream.Transform({
  transform(chunk, encoding, callback) {
    console.log(chunk.length);
    console.log(chunk)
    console.log(lowPass(chunk));
    this.push(lowPass(chunk));
    callback();
  }
});

// Set up express app
var app = express();

app.get('/music', function(req, res) {
  console.log('got request...');
  res.set({
    "Content-Type": "audio/mpeg",
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': '*'
  });
  var inputStream = fs.createReadStream('C:\\Users\\colby\\Downloads\\background-music.mp3');
  inputStream
    .pipe(inoutStream)
    .pipe(res);
});

app.listen(8080);

function lowPass(chunk) {
  var lastOut = 0;
  for (var i = 0; i < chunk.length; i++) {
    /*chunk[i] = lastOut + (chunk[i] - lastOut)/10;
    if (chunk[i] > 255) { chunk = 255 };
    if (chunk[i] < 0) { chunk = 0 };
    lastOut = chunk[i];*/
    chunk[i] = chunk[i] +1;
    if (chunk[i] > 255) { chunk = 255 };
  }
  return chunk;
}
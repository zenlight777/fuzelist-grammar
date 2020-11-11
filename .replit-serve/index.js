const express = require('express');
const path = require('path');
const app = express()

const DIST = path.resolve(process.cwd() + '/../dist/')
console.log(DIST)

app.use('/dist', express.static(DIST));

app.use('/', (req, res) => {
  var url = req.protocol + '://' + req.get('host') + req.originalUrl;

  res.set('Content-Type', 'text/plain');
  let r = 'Deploy URL: ' + url + 'dist';
  r += '\n'
  r += 'Repl.it URL: ' + url
  res.send(r);
});

app.listen(3000, function() {
  console.log('listening');
});
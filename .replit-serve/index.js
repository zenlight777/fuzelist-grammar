const express = require('express');
const path = require('path');
const app = express()

const DIST = path.resolve(process.cwd() + '/../dist/')
console.log(DIST)

app.use('/', express.static(DIST));

app.listen(3000, function() {
  console.log('listening');
});
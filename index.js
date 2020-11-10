import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const express = require('express');
const app = express()

app.use('/', express.static(process.cwd + '/dist'));

app.listen(3000, function() {
  console.log('listening');
});
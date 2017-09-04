#!/usr/bin/env node

const listFiles = process.argv.indexOf('list');
const pushFiles = process.argv.indexOf('push');
const { getShots } = require('./lib/list');
const { push } = require('./lib/push');

if (listFiles > -1) {
    console.log(getShots().join('\n'));
}

if (pushFiles > -1) {
    push(process.argv[pushFiles + 1]);
}
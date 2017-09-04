#!/usr/bin/env node

/* eslint-disable no-console */
const listFiles = (process.argv.indexOf('list') > -1);
const { getShots } = require('./lib/list');

if (listFiles) {
    console.log(getShots().join('\n'));
}

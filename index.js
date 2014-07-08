"use strict";

var es        = require('event-stream'),
    through   = require('through'),
    gutil     = require('gulp-util'),
    crypto    = require('crypto'),
    path      = require('path'),
    slash     = require('slash'),
    lineBreak = '\n';

function manifest(options) {
  options = options || {};
  var contents = [];
  contents.push('CACHE MANIFEST');

  var dest = options.dest || '.';
  var filename = options.filename || 'app.manifest';
  var exclude = [].concat(options.exclude || []);
  var hasher = crypto.createHash('sha256');

  if (options.timestamp) {
    contents.push('');
    contents.push('# Time: ' + new Date());
  }

  if (options.revision) {
    contents.push('');
    contents.push('# Revision: ' + options.revision);
  }

  contents.push('');
  contents.push('CACHE:');

  if (options.cache) {
    options.cache.forEach(function (file) {
      contents.push(encodeURI(file));
    });
  }

  function writeToManifest(file) {
    if (file.isNull())   return;
    if (file.isStream()) return this.emit('error', new gutil.PluginError('gulp-manifest',  'Streaming not supported'));

    var relative = slash(path.relative(dest, file.path));

    if (exclude.indexOf(relative) >= 0) {
      return;
    }

    contents.push(encodeURI(relative));

    if (options.hash) {
      hasher.update(file.contents, 'binary');
    }
  }

  function endStream() {
    // Network section
    options.network = options.network || ['*'];
    contents.push('');
    contents.push('NETWORK:');
    options.network.forEach(function (file) {
      contents.push(encodeURI(file));
    });

    // Fallback section
    if (options.fallback) {
      contents.push('');
      contents.push('FALLBACK:');
      options.fallback.forEach(function (file) {
        var firstSpace = file.indexOf(' ');
        if(firstSpace === -1) {
          return gutil.log('Invalid format for FALLBACK entry', file);
        }
        contents.push(
          encodeURI(file.substring(0, firstSpace)) +
          ' ' +
          encodeURI(file.substring(firstSpace + 1))
        );
      });
    }

    // Settings section
    if (options.preferOnline) {
      contents.push('');
      contents.push('SETTINGS:');
      contents.push('prefer-online');
    }

    // output hash to cache manifest
    if (options.hash) {
      contents.push('');
      contents.push('# Hash: ' + hasher.digest("hex"));
    }

    var cwd = process.cwd();
    var manifestFile = new gutil.File({
      cwd: cwd,
      base: cwd,
      path: path.join(cwd, filename),
      contents: new Buffer(contents.join(lineBreak))
    });

    this.emit('data', manifestFile);
    this.emit('end');
  }

  return through(writeToManifest, endStream);
}

module.exports = manifest;

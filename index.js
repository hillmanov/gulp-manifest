"use strict";

var es        = require('event-stream'),
    through   = require('through'),
    gutil     = require('gulp-util'),
    hasher    = require('crypto').createHash('sha256'),
    lineBreak = '\n';
 

function manifest(options) {
  var contents = [];
  contents.push('CACHE MANIFEST');
  
  if (options.timestamp) {
    contents.push('# Time: ' + new Date());
  }

  if (options.revision) {
    contents.push('# Revision: ' + options.revision);
  }

  contents.push(lineBreak);
  contents.push('CACHE:');

  if (options.cache) {
    options.cache.forEach(function (file) {
      contents.push(encodeURI(file));
    });
  }

  function writeToManifest(file) {
    if (file.isNull())   return;
    if (file.isStream()) return this.emit('error', new gutil.PluginError('gulp-manifest',  'Streaming not supported'));

    if (options.exclude) {
      if (options.options.exclude.indexOf(file.path) >= 0) {
        return;
      }
    }

    contents.push(encodeURI(file.path));

    if (options.hash) {
      hasher.update(file.contents, 'binary');
    }
  }

  function endStream() {
    // Network section
    options.network = options.network || ['*'];
    contents.push(lineBreak);
    contents.push('NETWORK:');
    options.network.forEach(function (file) {
      contents.push(encodeURI(file));
    });

    // Fallback section
    if (options.fallback) {
      contents.push(lineBreak);  
      contents.push('FALLBACK:');
      options.fallback.forEach(function (file) {
        contents.push(encodeURI(file));
      });
    }

    // Settings section
    if (options.preferOnline) {
      contents.push(lineBreak);
      contents.push('SETTINGS:');
      contents.push('prefer-online');
    }

    // output hash to cache manifest
    if (options.hash) {
      contents.push('\n# hash: ' + hasher.digest("hex"));
    }
    
    var manifestContents = contents.join(lineBreak);

    this.emit('data', manifestContents);
    this.emit('end');
  }

  return through(writeToManifest, endStream);
}

module.exports = manifest;

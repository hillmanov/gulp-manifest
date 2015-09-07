"use strict";

var through   = require('through'),
    gutil     = require('gulp-util'),
    crypto    = require('crypto'),
    path      = require('path'),
    minimatch = require('minimatch'),
    slash     = require('slash'),
    lineBreak = '\n';

function manifest(options) {
  var filename, exclude, hasher, cwd, contents;

  options = options || {};

  if(options.basePath) {
    gutil.log('basePath option is deprecated. Consider using gulp.src base instead: https://github.com/gulpjs/gulp/blob/master/docs/API.md#optionsbase');
  }

  filename = options.filename || 'app.manifest';
  exclude = Array.prototype.concat(options.exclude || []);
  hasher = crypto.createHash('sha256');
  cwd = process.cwd();
  contents = [];

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
    var prefix, filepath;

    if (file.isNull())   return;
    if (file.isStream()) return this.emit('error', new gutil.PluginError('gulp-manifest',  'Streaming not supported'));

    for (var i = 0; i < exclude.length; i++) {
      if(minimatch(file.relative, exclude[i])){
        return;
      }
    }

    prefix = options.prefix || '';
    filepath = slash(file.relative);

    if(options.basePath) { // deprecated
      var relative = path.relative(file.base, __dirname);
      filepath = filepath.replace(new RegExp('^' + path.join(relative, options.basePath)), '');
    }

    filepath = prefix + filepath;

    contents.push(encodeURI(filepath));

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
        var firstSpace = file.indexOf(' ');

        if (firstSpace === -1) {
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
      contents.push(lineBreak);
      contents.push('SETTINGS:');
      contents.push('prefer-online');
    }

    // output hash to cache manifest
    if (options.hash) {
      contents.push('\n# hash: ' + hasher.digest("hex"));
    }

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

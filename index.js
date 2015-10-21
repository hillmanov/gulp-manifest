"use strict";

var through   = require('through'),
    gutil     = require('gulp-util'),
    crypto    = require('crypto'),
    path      = require('path'),
    minimatch = require('minimatch'),
    slash     = require('slash'),
    lineBreak = '\n';

function manifest(options) {
  var filename, exclude, cache, include, hasher, cwd, contents;

  options = options || {};

  if(options.basePath) {
    gutil.log('basePath option is deprecated. Consider using gulp.src base instead: https://github.com/gulpjs/gulp/blob/master/docs/API.md#optionsbase');
  }

  filename = options.filename || 'app.manifest';
  include = Array.prototype.concat(options.include || []);
  exclude = Array.prototype.concat(options.exclude || []).concat(include);
  cache = Array.prototype.concat(options.cache || []);
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

  contents.push('');
  contents.push('CACHE:');

  contents = contents.concat(include);

  cache.forEach(function (file) {
    contents.push(encodeURI(file));
  });

  function shouldExcludeFile(filePath) {
    return exclude.some(minimatch.bind(null, filePath));
  }

  function writeToManifest(file) {
    var prefix, suffix, filepath;

    if (file.isNull())   return;
    if (file.isStream()) return this.emit('error', new gutil.PluginError('gulp-manifest',  'Streaming not supported'));

    prefix = slash(options.prefix || '');
    suffix = slash(options.suffix || '');
    filepath = slash(file.relative);

    if (shouldExcludeFile(filepath)) {
      return;
    }

    if(options.basePath) { // deprecated
      var relative = path.relative(file.base, __dirname);
      filepath = filepath.replace(new RegExp('^' + path.join(relative, options.basePath)), '');
    }

    filepath = [prefix, filepath, suffix].join('');

    contents.push(encodeURI(filepath));

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
      if (typeof options.fallback === 'string') {
        options.fallback = [options.fallback];
      }
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
      contents.push('');
      contents.push('SETTINGS:');
      contents.push('prefer-online');
    }

    // output hash to cache manifest
    if (options.hash) {
      contents.push('');
      contents.push('# hash: ' + hasher.digest("hex"));
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

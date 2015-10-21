var fs             = require('fs'),
    path           = require('path'),
    es             = require('event-stream'),
    slash          = require('slash'),
    should         = require('should'),
    gutil          = require('gulp-util'),
    gulp           = require('gulp'),
    mocha          = require('mocha'),
    manifestPlugin = require('../');

function createFakeFile(filename) {
  return new gutil.File({
    path: path.resolve('test/fixture/' + filename),
    cwd: path.resolve('test/'),
    base: path.resolve('test/fixture/'),
    contents: new Buffer('notimportant')
  });
}

describe('gulp-manifest', function() {
  var fileNames = ['file1.js', 'file2.js', 'file3.js', 'file4.js',
      'exclude/exclude1.js','exclude/exclude2.js',
      'exclude/children1/exclude3.js',
      'children2/include1.js','children2/exclude4.js',
      'children2/children3/include2.js','children2/children3/exclude5.js'
  ];
  var fakeFiles = fileNames.map(createFakeFile);

  it('Should generate a manifest file', function(done) {
    var stream = manifestPlugin({
      filename: 'cache.manifest',
      exclude: 'file2.js',
      hash: true,
      network: ['http://*', 'https://*', '*'],
      preferOnline: true
    });

    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);
      data.relative.should.eql('cache.manifest');

      var contents = data.contents.toString();
      contents.should.startWith('CACHE MANIFEST');
      contents.should.contain('CACHE:');
      contents.should.contain('file1.js');
      contents.should.not.contain('file2.js');
      contents.should.contain('file3.js');
      contents.should.contain('file4.js');
      contents.should.contain('# hash: ');
    });
    stream.once('end', done);

    fakeFiles.forEach(stream.write.bind(stream));
    stream.end();
  });

  it('Should work with Windows OS file system', function(done) {
    var stream = manifestPlugin({
        hash: false
    });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });
    stream.once('end', function() {
      contents.should.contain('fixture/hello.js');
      done();
    });

    stream.write(new gutil.File({
        path: path.resolve('test\\fixture\\hello.js'),
        cwd: path.resolve('test/'),
        base: path.resolve('test/'),
        contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should exclude multiple files', function(done) {
    var stream = manifestPlugin({
      exclude: ['file2.js', 'file4.js'],
    });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });
    stream.once('end', function() {
      contents.should.contain('file1.js');
      contents.should.not.contain('file2.js');
      contents.should.contain('file3.js');
      contents.should.not.contain('file4.js');
      done();
    });

    fakeFiles.forEach(stream.write.bind(stream));
    stream.end();
  });

  it('Should allow options.exclude to be a string', function(done) {
    var stream = manifestPlugin({
      exclude: 'file2.js'
    });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });
    stream.once('end', function() {
      contents.should.contain('file1.js');
      contents.should.not.contain('file2.js');
      contents.should.contain('file3.js');
      done();
    });

    fakeFiles.forEach(stream.write.bind(stream));
    stream.end();
  });

  it('Should work with hash multiple times', function (done) {
    function generateWithHash() {
      return new Promise(function(resolve, reject) {
        var stream = manifestPlugin({ hash: true });
        var contents = '';
        stream.on('data', function (data) {
          contents += data.contents.toString();
        });
        stream.once('end', function () {
          contents.should.contain('# hash: ');
          resolve();
        });
        fakeFiles.forEach(stream.write.bind(stream));
        stream.end();
      });
    }
    Promise.all([
      generateWithHash(),
      generateWithHash()
    ]).then(function() {
      done();
    });
  });

  it('Should generate a valid fallback section', function(done) {
    var stream = manifestPlugin({
      filename: 'cache.manifest',
      fallback: ['/ /offline.html'],
      network: ['http://*', 'https://*', '*']
    });

    var contents = '',
        relatives = [];
    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);
      relatives.push(data.relative);
      contents += data.contents.toString();
    });
    stream.once('end', function() {
      contents.should.contain('FALLBACK:\n/ /offline.html');
      relatives.indexOf('cache.manifest').should.not.be.equal(-1);
      done();
    });
    stream.end();
  });

  it('Should add a prefix', function(done) {
    var prefix = 'http://example.com/',
        stream = manifestPlugin({
          prefix: prefix
        });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });
    stream.once('end', function() {
      contents.should.contain(prefix);
      done();
    });

    stream.write(new gutil.File({
      path: path.resolve('test\\fixture\\hello.js'),
      cwd: path.resolve('test/'),
      base: path.resolve('test/'),
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should add a suffix', function(done) {
    var suffix = '?query',
      stream = manifestPlugin({
        suffix: suffix
      });

    stream.on('data', function(data) {
      var contents = data.contents.toString();
      contents.should.contain(suffix);
    });
    stream.once('end', done);

    stream.write(new gutil.File({
      path: path.resolve('test\\fixture\\hello.js'),
      cwd: path.resolve('test/'),
      base: path.resolve('test/'),
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });


  it('Should lookup fileglobs in directories', function(done) {
    var stream = manifestPlugin();

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.match(/^subdir\/somefile.txt$/gm);
      contents.should.match(/^subdir\/other\/file.txt$/gm);
      done();
    });

    gulp.src(path.join(__dirname, 'fixtures/**'))
    .pipe(stream);
  });

  it('Should lookup fileglobs relative to working directory when gulp.src.base is ./', function(done) {
    var stream = manifestPlugin();

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.match(/^test\/fixtures\/subdir\/somefile.txt$/gm);
      contents.should.match(/^test\/fixtures\/subdir\/other\/file.txt$/gm);
      done();
    });

    gulp.src(path.join(__dirname, 'fixtures/**'), {
      base: './'
    })
    .pipe(stream);
  });

  it('Should lookup fileglobs relative to gulp.src.base', function(done) {
    var stream = manifestPlugin();

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.match(/^fixtures\/subdir\/somefile.txt$/gm);
      contents.should.match(/^fixtures\/subdir\/other\/file.txt$/gm);
      done();
    });

    gulp.src(path.join(__dirname, 'fixtures/**'), {
      base: 'test'
    })
    .pipe(stream);
  });

  it('Should add correct path', function(done) {
    var filepath = 'test\\fixture\\hello.js',
        stream = manifestPlugin();

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.match(new RegExp('^' + slash(filepath) + '$', 'gm'));
      done();
    });

    stream.write(new gutil.File({
      path: slash(filepath),
      cwd: path.resolve('test/'),
      base: './',
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should remove the base path', function(done) {
    var basePath = 'basedir',
        stream = manifestPlugin({
          basePath: basePath
        });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.not.contain(basePath);
      done();
    });

    stream.write(new gutil.File({
      path: slash(basePath + '\\test\\fixture\\hello.js'),
      cwd: path.resolve('test/'),
      base: path.resolve('./'),
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should exclude special files', function(done) {
    var stream = manifestPlugin({
      filename: 'cache.manifest',
      exclude:  ['file2.js','exclude/**','children2/**/exclude*.js'],
      hash: true,
      network: ['http://*', 'https://*', '*'],
      preferOnline: true
    });

    var contents = '', relatives = [];
    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);

      relatives.push(data.relative);
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.startWith('CACHE MANIFEST');
      contents.should.contain('CACHE:');
      contents.should.contain('file1.js');
      contents.should.not.contain('file2.js');
      contents.should.contain('file3.js');
      contents.should.contain('file4.js');
      contents.should.contain('# hash: ');

      contents.should.not.contain('exclude');
      contents.should.contain('include1.js');
      contents.should.contain('include2.js');

      relatives.indexOf('cache.manifest').should.not.be.equal(-1);
      done();
    });

    fakeFiles.forEach(stream.write.bind(stream));

    stream.end();
  });

   it('Should exclude backslash excaped exclusions', function(done) {
    var stream = manifestPlugin({
      filename: 'cache.manifest',
      exclude:  ['some\\file.txt']
    });

    var contents = '', relatives = [];
    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);

      relatives.push(data.relative);
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.startWith('CACHE MANIFEST');
      contents.should.contain('CACHE:');
      contents.should.contain('somefile.txt');
      contents.should.not.contain('some/file.js');
      relatives.indexOf('cache.manifest').should.not.be.equal(-1);
      done();
    });

    gulp.src(path.join(__dirname, 'fixtures/**'), {
      base: 'test'
    })
    .pipe(stream);
  });

  it('Should add includes provided by option.include', function(done) {
    var basePath = 'basedir',
        stream = manifestPlugin({
          include: [
            'foo/bar'
          ]
        });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.contain('baz');
      contents.should.contain('foo/bar');
      done();
    });

    stream.write(new gutil.File({
      path: 'baz',
      base: path.resolve('./'),
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should allow option.include to be a string', function(done) {
    var basePath = 'basedir',
        stream = manifestPlugin({
          include: 'foo/bar'
        });

    var contents = '';
    stream.on('data', function(data) {
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.should.contain('baz');
      contents.should.contain('foo/bar');
      done();
    });

    stream.write(new gutil.File({
      path: 'baz',
      base: path.resolve('./'),
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should not duplicate includes', function(done) {
    var basePath = 'basedir',
        stream = manifestPlugin({
          include: [
            'foobar'
          ]
        });

    var contents = '', count = 0;
    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);
      contents += data.contents.toString();
    });

    stream.once('end', function() {
      contents.match(/foobar/gm).length.should.equal(1);
      done();
    });

    stream.write(new gutil.File({
      path: 'foobar',
      base: path.resolve('./'),
      contents: new Buffer('notimportant')
    }));

    stream.end();
  });

  it('Should handle option.cache as a string', function(done) {
    var stream = manifestPlugin({
      filename: 'cache.manifest',
      cache: 'foo.html'
    });

    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);
      data.relative.should.eql('cache.manifest');

      var contents = data.contents.toString();
      contents.should.startWith('CACHE MANIFEST');
      contents.should.contain('foo.html');
    });
    stream.once('end', done);

    fakeFiles.forEach(stream.write.bind(stream));
    stream.end();
  });

  it('Should handle option.cache as an array', function(done) {
    var stream = manifestPlugin({
      filename: 'cache.manifest',
      cache: ['foo.html', 'bar.js']
    });

    stream.on('data', function(data) {
      data.should.be.an.instanceOf(gutil.File);
      data.relative.should.eql('cache.manifest');

      var contents = data.contents.toString();
      contents.should.startWith('CACHE MANIFEST');
      contents.should.contain('foo.html');
      contents.should.contain('bar.js');
    });
    stream.once('end', done);

    fakeFiles.forEach(stream.write.bind(stream));
    stream.end();
  });
});

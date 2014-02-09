var fs             = require('fs'),
    path           = require('path'),
    es             = require('event-stream'),
    should         = require('should'),
    gutil          = require('gulp-util'),
    mocha          = require('mocha'),
    manifestPlugin = require('../');



describe('gulp-manifest', function() {

  it('Should generate a manifest file', function(done) {

    var fakeFile1 = new gutil.File({
      path: './test/fixture/file1.js',
      cwd: './test/',
      base: './test/fixture/',
      contents: new Buffer('notimportant')
    });
    
    var fakeFile2 = new gutil.File({
      path: './test/fixture/file2.js',
      cwd: './test/',
      base: './test/fixture/',
      contents: new Buffer('notimportant')
    });

    var fakeFile3 = new gutil.File({
      path: './test/fixture/file3.js',
      cwd: './test/',
      base: './test/fixture/',
      contents: new Buffer('notimportant')
    });

    var stream = manifestPlugin({
      filename: 'cache.manifest',
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
      contents.should.contain(fakeFile1.path);
      contents.should.contain(fakeFile2.path);
      contents.should.contain(fakeFile3.path);
      contents.should.contain('# hash: ');
    });

    stream.once('end', function() {
      done();
    });


    stream.write(fakeFile1);
    stream.write(fakeFile2);
    stream.write(fakeFile3);
    stream.end();
  });
});
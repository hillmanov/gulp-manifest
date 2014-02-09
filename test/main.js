var fs             = require('fs'),
    path           = require('path'),
    es             = require('event-stream'),
    should         = require('should'),
    gutil          = require('gulp-util'),
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

  it('Should generate a manifest file', function(done) {

    var fakeFile1 = createFakeFile('file1.js');
    var fakeFile2 = createFakeFile('file2.js');
    var fakeFile3 = createFakeFile('file3.js');

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
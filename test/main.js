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
  var fileNames = ['file1.js', 'file2.js', 'file3.js', 'file4.js'];
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

  it('Should exclude multiple files', function(done) {
    var stream = manifestPlugin({
      exclude: ['file2.js', 'file4.js'],
    });

    stream.on('data', function(data) {
      var contents = data.contents.toString();
      contents.should.contain('file1.js');
      contents.should.not.contain('file2.js');
      contents.should.contain('file3.js');
      contents.should.not.contain('file4.js');
    });
    stream.once('end', done);

    fakeFiles.forEach(stream.write.bind(stream));
    stream.end();
  });
});

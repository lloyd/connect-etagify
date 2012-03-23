const
should = require('should'),
http = require('http');

process.env['PORT'] = 0;
var app = require('./example.js').app;
var port;

describe('the test server', function() {
  it('should bind an ephemeral port', function() {
    port = app.address().port;
    (port).should.not.equal(0);
  });

  it('should have good default 404 behavior', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/404'
    }, function(res) {
      res.statusCode.should.equal(404);
      Object.keys(res.headers).should.not.include('etag');
      done();
    });
  });
});

describe('an etagified resource', function() {
  it('first request shouldnt have etag', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/page'
    }, function(res) {
      res.statusCode.should.equal(200);
      Object.keys(res.headers).should.not.include('etag');
      done();
    });
  });

  var etag;

  it('second request should have etag', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/page'
    }, function(res) {
      res.statusCode.should.equal(200);
      Object.keys(res.headers).should.include('etag');
      etag = res.headers['etag'];
      etag.should.equal('"bdb4fd9623de883e278a8539d029de2f"');

      done();
    });
  });

  it('if-none-match header should trigger 304', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/page',
      headers: {
        'If-None-Match': etag
      }
    }, function(res) {
      res.statusCode.should.equal(304);
      Object.keys(res.headers).should.not.include('etag');
      done();
    });
  });

  it('should ignore get data (dear reader, dont use etagify here)', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/page?foo=bar',
      headers: {
        'If-None-Match': etag
      }
    }, function(res) {
      res.statusCode.should.equal(304);
      Object.keys(res.headers).should.not.include('etag');
      done();
    });
  });
});

describe('an incrementally written etagified resource', function() {
  it('first request shouldnt have etag', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/page2'
    }, function(res) {
      res.statusCode.should.equal(200);
      Object.keys(res.headers).should.not.include('etag');
      done();
    });
  });

  var etag;

  it('second request should have etag', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/page2'
    }, function(res) {
      res.statusCode.should.equal(200);
      Object.keys(res.headers).should.include('etag');
      etag = res.headers['etag'];
      etag.should.equal('"bdb4fd9623de883e278a8539d029de2f"');
      done();
    });
  });
});

describe('a non-etagified resource', function() {
  it('first request shouldnt have etag', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/api'
    }, function(res) {
      res.statusCode.should.equal(200);
      Object.keys(res.headers).should.not.include('etag');
      done();
    });
  });

  var etag;

  it('second request STILL shouldn\'t have etag', function(done) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/api'
    }, function(res) {
      res.statusCode.should.equal(200);
      Object.keys(res.headers).should.not.include('etag');
      etag = res.headers['etag'];
      done();
    });
  });
});



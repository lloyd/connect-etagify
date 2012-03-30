const
should = require('should'),
http = require('http'),
assert = require('assert'),
crypto = require('crypto');

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

describe('responses with vary headers', function() {
  var requests = [
    {
      headers: {
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': 'en-US'
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': 'en-us'
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': 'en-US',
        'X-Foo': ''
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': '',
        'X-Foo': 'foo'
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': 'it-CH'
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': 'en-US',
        'X-Foo': 'foo'
      },
      etag: null
    },
    {
      headers: {
        'Accept-Languages': 'en-US',
        'X-Foo': 'bar'
      },
      etag: null
    },
    {
      headers: {
        'X-Foo': 'foo'
      },
      etag: null
    }
  ];

  function fetch(headers, cb) {
    http.get({
      host: '127.0.0.1',
      port: port,
      path: '/vary',
      headers: headers
    }, function(res) {
      var body = "";
      res.on('data', function(chunk) { body += chunk });
      res.on('end', function() {
        cb(res.headers['etag'], body, res.statusCode);
      });
    });
  }

  function stringify(r) {
    var str = "";
    Object.keys(r.headers).forEach(function(h) {
      str += " " + h + ":" + r.headers[h];
    });
    return str;
  }

  // make each request once to let the server calculate ETags
  requests.forEach(function(r) {
    it('should not have an ETag header on first request:' + stringify(r), function(done) {
      fetch(r.headers, function(etag, body, code) {
        (code).should.equal(200);
        should.strictEqual(etag, undefined);
        done();
      });
    });
  });

  // for each request, fetch it once and verify that ETag matches
  // md5 of contents
  requests.forEach(function(r) {
    it('should have correct ETag header on subsequent requests:' + stringify(r), function(done) {
      fetch(r.headers, function(etag, body, code) {
        (code).should.equal(200);
        var md5 = crypto.createHash('md5').update(body).digest('hex');
        should.strictEqual(etag, '"' + md5 + '"');
        r.etag = etag;
        done();
      });
    });
  });

  // verify 304s returned when proper etags included for all requests
  requests.forEach(function(r) {
    it('should return 304 when sent with If-None-Match:' + stringify(r), function(done) {
      r.headers['If-None-Match'] = r.etag;
      fetch(r.headers, function(etag, body, code) {
        (code).should.equal(304);
        done();
      });
    });
  });

  // verify all etags are distinct, given we know all content is distinct
  it('all ETags should be distinct', function() {
    var etags = [];
    requests.forEach(function(r) {
      (etags.indexOf(r.etag)).should.equal(-1);
      etags.push(r.etag);
    });

  });
});

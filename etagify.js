var crypto = require('crypto'),
   connect = require('connect');

var NULL = new Buffer(1);
NULL.writeUInt8(0x0, 0);

module.exports = function() {
  // path to etag mapping
  var etags = {
  };

  // given a request, and a set of vary headers, generate a hash representing
  // the headers.
  function hashVaryHeaders(vary, req) {
    var hash = crypto.createHash('md5');

    vary.forEach(function(header) {
      hash.update(req.headers[header] !== undefined ? req.headers[header] : NULL);
      hash.update(NULL);
    });

    return hash.digest(); // yes sir, we are using binary keys.
  }

  // given a request, see if we have an etag for it
  function getETag(r) {
    var etag;

    if (etags.hasOwnProperty(r.path)) {
      if (etags[r.path].vary) {
        var hash = hashVaryHeaders(etags[r.path].vary, r);
        etag = etags[r.path].md5s[hash];
      } else {
        etag = etags[r.path].md5;
      }
    }

    return etag;
  }

  return function(req, res, next) {
    var etag = getETag(req);
    if (etag) {
      res.setHeader('ETag', '"' + etag + '"');

      if (connect.utils.conditionalGET(req)) {
        if (!connect.utils.modified(req, res)) {
          res.removeHeader('ETag');
          return connect.utils.notModified(res);
        }
      }
    }

    res.etagify = function() {
      // if there's an ETag already on the response, do nothing
      if (res.header('ETag')) return;

      // otherwise, eavsedrop on the outbound response and generate a
      // content-based hash.
      var hash = crypto.createHash('md5');

      var write = res.write;
      res.write = function(chunk) {
        hash.update(chunk);
        write.call(res, chunk);
      };

      var end = res.end;
      res.end = function(body) {
        if (body) hash.update(body);
        var vary = res.getHeader('vary');
        if (vary) {
          if (!etags[req.path]) {
            etags[req.path] = {
              vary: vary.split(',').map(function(x) { return x.trim().toLowerCase(); }),
              md5s: { }
            };
          }
          var hdrhash = hashVaryHeaders(etags[req.path].vary, req);
          etags[req.path].md5s[hdrhash] = hash.digest('hex');
        } else {
          etags[req.path] = { md5: hash.digest('hex') };
        }
        end.apply(res, arguments);
      }
    };
    next();
  };
};

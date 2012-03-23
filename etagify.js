var crypto = require('crypto'),
   connect = require('connect');

module.exports = function() {
  // path to etag mapping
  var etags = {};

  return function(req, res, next) {
    if (etags.hasOwnProperty(req.path)) {
      res.setHeader('ETag', '"' + etags[req.path] + '"');

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
        etags[req.path] = hash.digest('hex');
        end.apply(res, arguments);
      }
    };
    next();
  };
};

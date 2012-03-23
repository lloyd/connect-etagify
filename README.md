## etagify

NodeJS connect middleware.  Adding [ETag](http://en.wikipedia.org/wiki/HTTP_ETag) headers to cachable but non-static content since 2012.

### before

    var app = require('express').createServer();

    app.get(function(req, res) {
      res.send("pulitzer prize. bam.");
    });

... and on the other side of the TCP connection ...

    HTTP/1.0 200 Fresh Hot Content
    Content-Length: 20

### after
    
    var app = require('express').createServer();    

    app.use(require('etagify')());

    app.get('/page', function(req, res) {
      res.etagify();
      res.send("pulitzer prize. bam.");
    });

... and on the other side of the TCP connection ...

    HTTP/1.0 304 Winning
    Content-Length: 0

## words

ETag headers are a client caching mechanism that when applied let you
push fewer bits over the wire and make web pages load faster.  Pages
you serve through connect's static middleware already have proper ETag
headers.  All other dynamic request - like templates rendered on the
server - don't.  If you serve non-static content that is gauranteed
not to change between server restarts in production, the etagify
middleware makes it easy to serve this content with proper etag
headers based on a hash of your content.

## see also...

...[cachify](https://github.com/mozilla/connect-cachify) for a way to get
awesome long term caching of your static resources.

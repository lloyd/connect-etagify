var app = require('express').createServer();    

app.use(require('./etagify.js')());

// this is an example route that constructs and serves a non-static but
// cachable page
app.get('/page', function(req, res) {
  // apply cache headers - allow caching but force revalidation all
  // the time
  res.setHeader('Cache-Control', 'public, max-age=0');  
  
  // use ETags
  res.etagify();

  res.send("pulitzer prize. bam.");
});

// this is an example route that constructs and serves a non-static but
// cachable page - that's incrementally written
app.get('/page2', function(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=0');  
  res.etagify();

  res.write("pulitzer ");
  process.nextTick(function() {
    res.write("prize. ");    
    process.nextTick(function() {
      res.write("bam.");
      process.nextTick(function() {
        res.end();
      });
    });
  });
});

// this is and example route that is a rest api request
app.get('/api', function(req, res) {
  // for api calls, don't use etags and don't allow client to cache
  // results.
  res.setHeader('Cache-Control', 'no-cache, max-age=0');
  res.send("no etagify here, because the results aren't cachable.");
});

app.listen(process.env['PORT'] || 8080, '127.0.0.1');

// ignore me.  this is so tests can use this little server programatically.
exports.app = app;

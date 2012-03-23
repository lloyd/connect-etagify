var app = require('express').createServer();    

app.use(require('./etagify.js')());

app.get('/page', function(req, res) {
  res.etagify();
  res.send("pulitzer prize. bam.");
});

app.listen(8080);

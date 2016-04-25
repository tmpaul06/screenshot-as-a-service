/**
 * Module dependencies.
 */
var config = require('config');
var express = require('express');
var RasterizerService = require('./lib/rasterizerService');
var RasterizerServicev2 = require('./lib/rasterizerServicev2');
var FileCleanerService = require('./lib/fileCleanerService');

process.on('uncaughtException', function (err) {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

process.on('SIGTERM', function () {
  process.exit(0);
});

process.on('SIGINT', function () {
  process.exit(0);
});

// web service
var app = express();
app.configure(function(){
  //app.use(express.static(__dirname + '/public'))
  app.use(app.router);
  app.set('rasterizerService', new RasterizerService(config.rasterizer).startService());
  // app.set('rasterizerServicev2', new RasterizerServicev2(config.rasterizerv2).startService());
  app.set('fileCleanerService', new FileCleanerService(config.cache.lifetime));
});
// app.configure('development', function() {
//   app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
// });

if (app.get('env') === 'development') {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}
require('./routes')(app, config.server.useCors);
app.listen(config.server.port, config.server.host);
console.log('Express server listening on ' + config.server.host + ':' + config.server.port);

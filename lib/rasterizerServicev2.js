var spawn = require('child_process').spawn;
var request = require('request');

var RasterizerServicev2 = function(config) {
  this.isStopping = false;
  this.config = config;
  this.rasterizer;
  this.pingDelay = 20000; // every 10 seconds
  this.sleepTime = 60000; // three failed health checks, 30 seconds
  this.lastHealthCheckDate = null;
  var self = this;
  process.on('exit', function() {
    self.isStopping = true;
    self.killService();
  });
}

RasterizerServicev2.prototype.rasterizerExitHandler = function (code) {
  if (this.isStopping) return;
  console.log('casperjs failed; restarting');
  this.startService();
};


RasterizerServicev2.prototype.startService = function () {
  var rasterizer = spawn(this.config.command, ['scripts/rasterizerv2.js', this.config.path, this.config.host + ':' + this.config.port, this.config.viewport]);

  rasterizer.stderr.on('data', function (data) {
    console.log('casperjs error: ' + data);
  });
  rasterizer.stdout.on('data', function (data) {
    console.log('casperjs output: ' + data);
  });
  rasterizer.on('exit', this.rasterizerExitHandler);

  this.rasterizer = rasterizer;
  this.lastHealthCheckDate = Date.now();
  this.pingServiceIntervalId = setInterval(this.pingService.bind(this), this.pingDelay);
  this.checkHealthIntervalId = setInterval(this.checkHealth.bind(this), 1000);
  console.log('Casperjs internal server listening on port ' + this.config.port);
  return this;
}

RasterizerServicev2.prototype.killService = function() {
  if (this.rasterizer) {
    // Remove the exit listener to prevent the rasterizer from restarting
    this.rasterizer.removeListener('exit', this.rasterizerExitHandler);
    this.rasterizer.kill();
    clearInterval(this.pingServiceIntervalId);
    clearInterval(this.checkHealthIntervalId);
    console.log('Stopping Casperjs internal server');
  }
}

RasterizerServicev2.prototype.restartService = function() {
  if (this.rasterizer) {
    this.killService();
    this.startService();
  }
}

RasterizerServicev2.prototype.pingService = function() {
  if (!this.rasterizer) {
    this.lastHealthCheckDate = 0;
  }
  var self = this;
  request('http://localhost:' + this.getPort() + '/healthCheck', function(error, response) {
    if (error || response.statusCode != 200) return;
    self.lastHealthCheckDate = Date.now();
  });
}

RasterizerServicev2.prototype.checkHealth = function() {
  if (Date.now() - this.lastHealthCheckDate > this.sleepTime) {
    console.log('casperjs process is sleeping. Restarting.');
    this.restartService();
  }
}

RasterizerServicev2.prototype.getPort = function() {
  return this.config.port;
}

RasterizerServicev2.prototype.getPath = function() {
  return this.config.path;
}

module.exports = RasterizerServicev2;

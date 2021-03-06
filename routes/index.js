var utils = require('../lib/utils');
var join = require('path').join;
var fs = require('fs');
var path = require('path');
var request = require('request');
var express = require('express');
var spawn = require('child_process').spawn;
var config = require('config');

function roundTo(numA, numB) {
  return Math.round(numA/numB) * numB;
}

module.exports = function(app, useCors) {
  var rasterizerService = app.settings.rasterizerService;
  var fileCleanerService = app.settings.fileCleanerService;
  var rasterizerServicev2 = app.settings.rasterizerServicev2;
  var configv2 = config.rasterizerv2;
  // routes
  var imagePath = path.join(path.dirname(module.parent.filename),'images');
  app.use('/images', express.static(imagePath));

  app.get('/screenshot/v2', function(req, res, next) {
    if (!req.param('url', false)) {
      return res.redirect('/usage.html');
    }

    var url = req.param('url');
    var selector = req.param('selector');
    var authorizationHeader = req.param('authorization');
    var delay = req.param('delay');

    var options = {};
    ['url', 'selector', 'delay'].forEach(function(name) {
      if (req.param(name, false)) options[name] = req.param(name);
    });

    var configPath = 'images/' + ('screenshot_' + utils.md5(url + JSON.stringify(options) + Date.now()) + '.png')

    var rasterizerv2 = spawn(configv2.command, [
      'scripts/rasterizerv2.js',
      url,
      configPath,
      selector,
      delay,
      authorizationHeader
    ]);

    rasterizerv2.stderr.on('data', function (data) {
      console.log('casperjs error: ' + data);
    });

    rasterizerv2.stdout.on('data', function (data) {
      console.log('casperjs output: ' + data);
    });

    rasterizerv2.on('exit', function () {
      console.log("screenshot captured");
    });

    res.send(configPath);
  });

  app.get('/screenshot', function(req, res, next) {
    if (!req.param('url', false)) {
      return res.redirect('/usage.html');
    }

    var url = req.param('url');
    // required options
    var options = {
      uri: 'http://localhost:' + rasterizerService.getPort() + '/',
      headers: { url: url }
    };
    ['width', 'height', 'clipRect',
    'javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled',
    'userAgent', 'userName', 'password', 'delay', 'selector', 'roamtoken', 'domain'].forEach(function(name) {
      if (req.param(name, false)) options.headers[name] = req.param(name);
    });

    // var now = Date.now();
    // var nearestFiveMinutes = roundTo(now, 5 * 60 * 1000);
    var filename = 'screenshot_' + utils.md5(url + JSON.stringify(options) + Date.now()) + '.png';
    options.headers.filename = filename;

    var filePath = join(rasterizerService.getPath(), filename);

    var callbackUrl = req.param('callback', false) ? utils.url(req.param('callback')) : false;

    if (fs.existsSync(filePath)) {
      console.log('Request for %s - Found in cache', url);
      processImageUsingCache(filePath, res, callbackUrl, function(err) { if (err) next(err); });
      return;
    }
    console.log('Request for %s - Rasterizing it', url);
    processImageUsingRasterizer(options, filePath, res, callbackUrl, function(err) { if(err) next(err); });
  });

  // app.get('*', function(req, res, next) {
  //   // for backwards compatibility, try redirecting to the main route if the request looks like /www.google.com
  //   res.redirect('/?url=' + req.url.substring(1));
  // });

  // bits of logic
  var processImageUsingCache = function(filePath, res, url, callback) {
    if (url) {
      // asynchronous
      res.send('Will post screenshot to ' + url + ' when processed');
      postImageToUrl(filePath, url, callback);
    } else {
      // synchronous
      sendImageInResponse(filePath, res, callback);
    }
  }

  var processImageUsingRasterizer = function(rasterizerOptions, filePath, res, url, callback) {
    if (url) {
      // asynchronous
      res.send('Will post screenshot to ' + url + ' when processed');
      callRasterizer(rasterizerOptions, function(error) {
        if (error) return callback(error);
        postImageToUrl(filePath, url, callback);
      });
    } else {
      // synchronous
      res.json({
        path: filePath
      });
      callRasterizer(rasterizerOptions, function(error) {
        if (error) return callback(error);
        sendImageInResponse(filePath, res, callback);
      });
    }
  }

  var callRasterizer = function(rasterizerOptions, callback) {
    request.get(rasterizerOptions, function(error, response, body) {
      if (error || response.statusCode != 200) {
        console.log('Error while requesting the rasterizer: %s', error.message);
        rasterizerService.restartService();
        return callback(new Error(body));
      }
      else if (body.indexOf('Error: ') == 0) {
        var errmsg = body.substring(7);
        console.log('Error while requesting the rasterizer: %s', errmsg);
        return callback(new Error(errmsg));
      }
      callback(null);
    });
  }

  var postImageToUrl = function(imagePath, url, callback) {
    console.log('Streaming image to %s', url);
    var fileStream = fs.createReadStream(imagePath);
    fileStream.on('end', function() {
      fileCleanerService.addFile(imagePath);
    });
    fileStream.on('error', function(err){
      console.log('Error while reading file: %s', err.message);
      callback(err);
    });
    fileStream.pipe(request.post(url, function(err) {
      if (err) console.log('Error while streaming screenshot: %s', err);
      callback(err);
    }));
  }

  var sendImageInResponse = function(imagePath, res, callback) {
    console.log('Sending image in response');
    fileCleanerService.addFile(imagePath);
    // if (useCors) {
    //   res.setHeader("Access-Control-Allow-Origin", "*");
    //   res.setHeader("Access-Control-Expose-Headers", "Content-Type");
    // }
    // res.sendfile(imagePath, function(err) {
    //   fileCleanerService.addFile(imagePath);
    //   callback(err);
    // });
  }

};

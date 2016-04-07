/*
 * phantomjs rasteriser server
 *
 * Usage:
 *   phantomjs rasterizer.js [basePath] [port] [defaultViewportSize]
 *
 * This starts an HTTP server waiting for screenshot requests
 */
var fs = require('fs');
var basePath = fs.workingDirectory + '/images/';

var port  = 3001;

var defaultViewportSize = '';
defaultViewportSize = defaultViewportSize.split('x');
defaultViewportSize = {
  width: ~~defaultViewportSize[0] || 1024,
  height: ~~defaultViewportSize[1] || 768
};

var pageSettings = ['javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled', 'userAgent', 'userName', 'password'];

var server, service;

server = require('webserver').create();

/*
 * Screenshot service
 *
 * Generate a screenshot file on the server under the basePath
 *
 * Usage:
 * GET /
 * url: http://www.google.com
 *
 * Optional headers:
 * filename: google.png
 * width: 1024
 * height: 600
 * clipRect: { "top": 14, "left": 3, "width": 400, "height": 300 }
 *
 * If path is omitted, the service creates it based on the url, removing the
 * protocol and replacing all slashes with dots, e.g
 * http://www.google.com => www.google.com.png
 *
 * width and height represent the viewport size. If the content exceeds these
 * boundaries and has a non-elastic style, the screenshot may have greater size.
 * Use clipRect to ensure the final size of the screenshot in pixels.
 *
 * All settings of the WebPage object can also be set using headers, e.g.:
 * javascriptEnabled: false
 * userAgent: Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+
 */
service = server.listen(port, function(request, response) {
  if (request.url == '/healthCheck') {
    response.statusCode = 200;
    response.write('up');
    response.close();
    return;
  }
  if (!request.headers.url) {
    response.statusCode = 400;
    response.write('Error: Request must contain an url header' + "\n");
    response.close();
    return;
  }
  var url = request.headers.url;
  var path = basePath + (request.headers.filename || (url.replace(new RegExp('https?://'), '').replace(/\//g, '.') + '.png'));
  var page = new WebPage();
  var cookie = {
    'name': 'roamtoken',
    'value': request.headers.roamtoken,
    'domain': request.headers.domain,
    'path': '/'
  };
  phantom.addCookie(cookie);
  page.onResourceError = function(resourceError) {
    page.error_reason = resourceError.errorString;
  };
  var delay = request.headers.delay || 0;
  try {
    page.viewportSize = {
      width: request.headers.width || defaultViewportSize.width,
      height: request.headers.height || defaultViewportSize.height
    };
    if (request.headers.clipRect) {
      page.clipRect = JSON.parse(request.headers.clipRect);
    }
    for (name in pageSettings) {
      if (value = request.headers[pageSettings[name]]) {
        value = (value == 'false') ? false : ((value == 'true') ? true : value);
        page.settings[pageSettings[name]] = value;
      }
    }
  } catch (err) {
    response.statusCode = 500;
    response.write('Error while parsing headers: ' + err.message);
    return response.close();
  }
  page.open(url, function(status) {
    if (status == 'success') {
      window.setTimeout(function () {
        var selector = request.headers.selector;
        if (selector) {
          var rect = page.evaluate(function(selector) {
            if (selector === undefined) {
              return null;
            }
            var elem = document.querySelector(selector);
            if (elem) {
              var clipRect = elem.getBoundingClientRect();
              return {
                top: clipRect.top,
                left: clipRect.left,
                width: clipRect.width,
                height: clipRect.height
              };
            }
            return null;
          }, selector);
          if (rect !== null) {
            page.clipRect = rect;
          }
        }
        page.render(path);
        response.write('Success: Screenshot saved to ' + path + "\n");
        page.release();
        response.close();
      }, delay);
    } else {
      response.write('Error: Url returned status ' + status + ' - ' + page.error_reason + "\n");
      page.release();
      response.close();
    }
  });
  // must start the response now, or phantom closes the connection
  response.statusCode = 200;
  response.write('');
});

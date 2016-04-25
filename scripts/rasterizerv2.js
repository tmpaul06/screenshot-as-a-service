/*
* Takes provided URL passed as argument and make screenshots of this page with several viewport sizes.
* These viewport sizes are arbitrary, taken from iPhone & iPad specs, modify the array as needed
*
* Usage:
* $ casperjs screenshots.js http://example.com
*/

var casper = require("casper").create();

var screenshotUrl = casper.cli.args[0];
var screenshotPath = casper.cli.args[1];
var selector = casper.cli.args[2];
var delay = casper.cli.args[3];
var authorizationHeader = casper.cli.args[4];
var viewports = [
  {
    'name': 'desktop-standard',
    'viewport': {width: 1000, height: 1000}
  }
];

// if (casper.cli.args.length < 1) {
//   casper
//     .echo("Usage: $ casperjs screenshots.js http://example.com")
//     .exit(1)
//   ;
// } else {
//   screenshotUrl = casper.cli.args[0];
// }

casper.start(screenshotUrl, function() {
  this.echo('Current location is ' + this.getCurrentUrl(), 'info');
});

casper.each(viewports, function(casper, viewport) {
  this.then(function() {
    if (authorizationHeader) {
      casper.page.customHeaders = {
          "Authorization": authorizationHeader
      };
    }
    this.viewport(viewport.viewport.width, viewport.viewport.height);
  });
  this.thenOpen(screenshotUrl, function() {
    this.wait(delay);
  });
  this.then(function(){
    this.echo('Screenshot for ' + viewport.name + ' (' + viewport.viewport.width + 'x' + viewport.viewport.height + ')', 'info');
    this.captureSelector(screenshotPath, selector);
  });
});

casper.run();

function pad(number) {
  var r = String(number);
  if ( r.length === 1 ) {
    r = '0' + r;
  }
  return r;
}

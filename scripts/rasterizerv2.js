/*
* Takes provided URL passed as argument and make screenshots of this page with several viewport sizes.
* These viewport sizes are arbitrary, taken from iPhone & iPad specs, modify the array as needed
*
* Usage:
* $ casperjs screenshots.js http://example.com
*/

var casper = require("casper").create();

var screenshotUrl = 'http://54.67.6.237:8080/?search=roam753523346',
    screenshotNow = new Date(),
    screenshotDateTime = screenshotNow.getFullYear() + pad(screenshotNow.getMonth() + 1) + pad(screenshotNow.getDate()) + '-' + pad(screenshotNow.getHours()) + pad(screenshotNow.getMinutes()) + pad(screenshotNow.getSeconds()),
    viewports = [
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
    casper.page.customHeaders = {
        "Authorization": "Basic ZGVtbzppbnNpZ2h0IQ=="
    };
    this.viewport(viewport.viewport.width, viewport.viewport.height);
  });
  this.thenOpen(screenshotUrl, function() {
    this.wait(5000);
  });
  this.then(function(){
    this.echo('Screenshot for ' + viewport.name + ' (' + viewport.viewport.width + 'x' + viewport.viewport.height + ')', 'info');
    this.captureSelector('images/' + screenshotDateTime + '_' + viewport.name + '-' + viewport.viewport.width + 'x' + viewport.viewport.height + '.png', '#resultscontainer');
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

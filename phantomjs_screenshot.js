'use strict';



var phantom = require('phantom');



function getRandomPort(min, max) {

  return Math.floor(Math.random() * (max - min + 1)) + min;

}



function authorize(token, cb) {

  phantom.create({

    port : getRandomPort(40000, 60000)

  }, function (ph) {
    console.log('Creating page');

    ph.createPage(function (page) {

      page.set('viewportSize', {width: 1920, height: 1080});

      cb(ph, page);

    });

  });

}



/* Options
 *
 *  id : analysisId,
 *
 *   selector : CSS selector,
 *
 *    output : output file
 *
 *     renderdelay : delay time for render */

function capture(ph, page, options, callback) {
  var url = 'https://baxalta-dev.roaminsight.net/flow/#/dashboard/scenarios/all';
  console.log(ph.addCookie);
  ph.addCookie({
    'name': 'roamtoken',
    'value': options.roamtoken,
    'domain': 'baxalta-dev.roaminsight.net'
  });
  page.open(url, function(status) {
    page.evaluate((function() {

      var func = function(selector) {

        document.body.bgColor = 'white';

        if (selector === undefined) {

          return null;

        }

        var elem = document.querySelector(selector);

        return (elem !== null) ? elem.getBoundingClientRect() : null;

      };



      return 'function() { return (' + func.toString() + ').apply(this, ' + JSON.stringify([options.selector]) + ');}';

    }()), function(rect) {

      if (rect !== null) {

        page.set('clipRect', rect);

      }
      console.log('Rendering');
      setTimeout(function() {
        
        page.render(options.output, function() {

          ph.exit();

          process.nextTick(callback);

        });

      }, options.delay || 250);





    });

  });

}





module.exports = {

  authorize : authorize,

  capture : capture

};

  /*
  Cartogram forked from the original http://prag.ma/code/d3-cartogram/

  - Designed to compute a series of cartograms, using web workers.

  - Attempts to add the effective range tip from Algorithms for Cartogram Animation,
  by Ouyang et al., which should make it slightly faster.

  Usage :
  --------


  var promiseOfGeos = cartogramaster(
    {
      topology: topojsonData,
      geometries: topojsonData.objects.OBJECTNAME.geometries,
      anchorSize: {x: x, y: y},
      projection: {
        name: "mercator",


      }
    },
    values
  );


 * Usage:
 *
 * var cartogram = d3.cartogram()
 *  .projection(d3.geo.albersUsa())
 *  .value(function(d) {
 *    return Math.random() * 100;
 *  });
 * d3.json("path/to/topology.json", function(topology) {
*  var features = cartogram(topology, topology.objects.OBJECTNAME.geometries);
 *  d3.select("svg").selectAll("path")
 *    .data(features)
 *    .enter()
 *    .append("path")
 *      .attr("d", cartogram.path);
 * });
 */

require('../d3.js')

var Worker = require("worker!./worker.js");
var _ = require('underscore.deferred')

function cartogwam(geo, values, featureProperty) {
  var dfd = new _.Deferred();

  // How many cartograms to compute ?
  var tasks = Object.keys(values);

  var n = tasks.length;

  var workers = [],
  results = {};

  function post(worker, index){
    worker.postMessage({
      do: 'carto',
      geo: geo,
      values: values[index],
      featureProperty: featureProperty,
      task: index
    })
  }

  // Spawn 8 workers max, feed them sequentially until all tasks are done.
  while (workers.length < 9 && tasks.length > 0){

   var worker = new Worker
   workers.push(worker)

   work(worker, tasks.pop())

  }

  function work(worker, i){

   worker.onmessage = function(event){
     if (event.data.done === 'processing'){
       dfd.notify(Object.keys(results).length / n)
       results[event.data.task] = event.data

       //the end
       if (Object.keys(results).length === n){
         dfd.resolve(results);
         workers.forEach(function(w){
           w.terminate()
         });
         return;
       }
       if (tasks.length > 0){
         var j = tasks.pop()
         post(worker, j)
       }
     }
   }

   post(worker, i)
  }

return dfd
};


module.exports = cartogwam

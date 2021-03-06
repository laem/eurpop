  /*
  Cartogram forked from the original http://prag.ma/code/d3-cartogram/

  - Designed to compute a series of cartograms (called tasks),
  using web workers, or in a single node thread.

  - For this, only a subset of d3 is used, and the usage is more constrained.

  - Also attempts to add the effective range tip from Algorithms for Cartogram Animation,
  by Ouyang et al., which should make it slightly faster.

  Usage :
  --------

  var promiseOfGeos = cartogramaster(
    {
      topology: topojsonData,
      // the geometries of the GeometryCollection object to reshape :
      geometries: topojsonData.objects.OBJECTNAME.geometries,
      projection: {
        name: 'mercator',
        translation: [X,Y],
        scaling: scaling
      }
    },
    values, // { taskId => { geoJsonFeatureValue => area wanted} }
    featureProperty // geoJsonFeatureIdKey to link geojson features to values
  );


 **** Original cartogram.js usage *********
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

function spawnWorker(){
  if (typeof window !== 'undefined'){
    var Worker = require("worker!./worker.js");
    return new Worker
  } else {
    var Worker = require('./worker.js')
    return new Worker()
  }
};


var _ = require('underscore.deferred')

function cartogramaster(geo, values, featureProperty) {
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

   var worker = spawnWorker()
   workers.push(worker)

   work(worker, tasks.pop())

  }

  function work(worker, i){

   worker.onmessage = function(event){
     var data = event
     if (typeof event.data!== 'undefined') data = event.data

     if (data.done === 'processing'){
       dfd.notify(Object.keys(results).length / n)
       results[data.task] = data

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


module.exports = cartogramaster

  /*
 * d3.cartogram is a d3-friendly implementation of An Algorithm to Construct
 * Continuous Area Cartograms:
 *
 * <http://chrisman.scg.ulaval.ca/G360/dougenik.pdf>
 *
 * It uses the effective range tip from Algorithms for Cartogram Animation, by Ouyang et al.
 *
 * It requires topojson to decode TopoJSON-encoded topologies:
 *
 * <http://github.com/mbostock/topojson/>
 *
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

 require('./d3.js')

 var Worker = require("worker!./worker");
 var _ = require('underscore.deferred')

 function cartogwam(geo, values) {
   var dfd = new _.Deferred();

   // How many cartograms to compute ?
   var tasks = Object.keys(values);

   var n = tasks.length;

   var workers = [],
    results = {};


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
           worker.postMessage({
             do: 'carto',
             geo: geo,
             values: values[j],
             task: j
           })
         }
       }
     }

     worker.postMessage({
       do: 'carto',
       geo: geo,
       values: values[i],
       task: i
     })
   }

  return dfd
};


module.exports = cartogwam

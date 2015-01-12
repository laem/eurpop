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

 require('./d3.v3.min.js')

 var Worker = require("worker!./worker");
 var _ = require('underscore.deferred')

 function cartogram() {

  function carto(topology, geometries, anchorSize) {

    var dfd = new _.Deferred(); // tada!
    var worker = new Worker;

    worker.onmessage = function(event){
      if (event.data.done === 'processing'){
        dfd.resolve(event.data)
      }
    }

    worker.postMessage({
      do: 'carto',
      topology: topology, geometries: geometries, anchorSize: anchorSize
    })

    return dfd.promise()

  }

  return carto;
};


function functor(v) {
  return typeof v === "function" ? v : function() { return v; };
}

module.exports = cartogram

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

  function carto(topology, geometries) {

    var dfd = new _.Deferred(); // tada!
    var worker = new Worker;

    worker.onmessage = function(event){
      debugger;
      if (event.done === 'processing'){
        dfd.resolveWith(event.data)
      }
    }

    worker.postMessage({
      do: 'carto',
      topology: topology, geometries: geometries
    })

    return dfd.promise()

  }

  var iterations = 8,
      projection = d3.geo.albers(),
      properties = function(obj) {
        return obj.properties || {};
      },
      value = function(d) {
        return 1;
      };

  // for convenience
  carto.path = d3.geo.path().projection(null);

  carto.iterations = function(i) {
    if (arguments.length) {
      iterations = i;
      return carto;
    } else {
      return iterations;
    }
  };

  carto.value = function(v) {
    if (arguments.length) {
      value = functor(v);
      return carto;
    } else {
      return value;
    }
  };

  carto.projection = function(p) {
    if (arguments.length) {
      projection = p;
      return carto;
    } else {
      return projection;
    }
  };

  carto.feature = function(topology, geom) {
    return {
      type: "Feature",
      id: geom.id,
      properties: properties.call(null, geom, topology),
      geometry: {
        type: geom.type,
        coordinates: topojson.object(topology, geom).coordinates
      }
    };
  };

  carto.features = function(topo, geometries) {
    return geometries.map(function(f) {
      return carto.feature(topo, f);
    });
  };

  carto.properties = function(props) {
    if (arguments.length) {
      properties = functor(props);
      return carto;
    } else {
      return properties;
    }
  };

  return carto;
};


function functor(v) {
  return typeof v === "function" ? v : function() { return v; };
}

module.exports = cartogram

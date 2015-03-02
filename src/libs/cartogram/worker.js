//Use a partial d3 build, that doesn't need the DOM.
require('./d3.geo/d3f.js')
var Helpers = require('./helpers')


if (typeof onmessage !== 'undefined'){
  onmessage = messaged
} else {
  function Wo(){}
  Wo.prototype.postMessage = messaged
  Wo.prototype.terminate = function(){}
  module.exports = Wo
}

function messaged(event) {
  var data = event
  if (typeof event.data!== 'undefined') data = event.data

  if (data.do === 'carto'){

    var geo = data.geo,
          topology = geo.topology,
          geometries = geo.geometries,
          path = geo.path,
          translation = geo.translation,
          projectionName = geo.projection.name,
          scaling = geo.projection.scaling,
          translation = geo.projection.translation;

    var values = data.values,
        featureProperty = data.featureProperty,
        task = data.task;



    // copy it first
    topology = Helpers.copy(topology);



    // objects are projected into screen coordinates
    // project the arcs into screen space


    var projection =
          d3f.geo[projectionName]()
            .scale(scaling)
            .translate(translation)


    var tf = Helpers.transformer(topology.transform),x,y,nArcVertices,vI,out1,nArcs=topology.arcs.length,aI=0,
    projectedArcs = new Array(nArcs);
    while(aI < nArcs){
      x = 0;
      y = 0;
      nArcVertices = topology.arcs[aI].length;
      vI = 0;
      out1 = new Array(nArcVertices);
      while( vI < nArcVertices){
        topology.arcs[aI][vI][0] = (x += topology.arcs[aI][vI][0]);
        topology.arcs[aI][vI][1] = (y += topology.arcs[aI][vI][1]);
        out1[vI] = projection(tf(topology.arcs[aI][vI]));
        vI++;
      }
      projectedArcs[aI++]=out1;

    }

    // path with identity projection
    var path = d3f.geo.path()
    .projection(null);


    var objects = Helpers.object(projectedArcs, {type: "GeometryCollection", geometries: geometries})
    .geometries.map(function(geom) {
      return {
        type: "Feature",
        id: geom.id,
        properties: Helpers.properties.call(null, geom, topology),
        geometry: geom
      };
    });

    function value(d){
      return values[d.properties[featureProperty]]
    }

    var objectValues = objects.map(value),
      totalValue = objectValues.reduce(function(a,b){return a + b;});

    var iterations = 8;


    //console.time("processing:" + task)
    var i = 0;
    while (i++ < iterations) {

      //var areas = objects.map(path.area)
      //var totalArea = areas.reduce(function(a,b){return a + b}),
      var areas = [], totalArea = 0;
      for (var k = 0; k < objects.length; k++){
        var area = path.area(objects[k])
        areas.push(area)
        totalArea += area
      }

      var sizeErrorsTot = 0,
      sizeErrorsNum = 0;

      ///for i = 1 to n do
      var meta = []
      for (var j = 0; j < objects.length; j++){
        var o = objects[j],
            area = Math.abs(areas[j]), // XXX: why do we have negative areas?
            v = +objectValues[j],
            ///Compute AD i , the desired area of the ith cell
            desired = totalArea * v / totalValue,
            radius = Math.sqrt(area / Math.PI),
            mass = Math.sqrt(desired / Math.PI) - radius,
            sizeError = Math.max(area, desired) / Math.min(area, desired);

        sizeErrorsTot+=sizeError;
        sizeErrorsNum++;
        // console.log(o.id, "@", j, "area:", area, "value:", v, "->", desired, radius, mass, sizeError);
        meta.push({
          id:         o.id,
          area:       area,
          centroid:   path.centroid(o),
          value:      v,
          desired:    desired,
          range: 100 * (Math.abs(desired - area)) / (Math.sqrt(Math.PI * area)),
          radius:     radius,
          mass:       mass,
          sizeError:  sizeError
        })
      }

      var sizeError = sizeErrorsTot / sizeErrorsNum,
          forceReductionFactor = 1 / (1 + sizeError);

      // console.log("meta:", meta);
      // console.log("  total area:", totalArea);
      // console.log("  force reduction factor:", forceReductionFactor, "mean error:", sizeError);

      var nArcVertices,vI,delta,nArcs=projectedArcs.length,aI=0,delta,nPolygon,pI,centroid,mass,radius,rSquared,dx,dy,distSquared,dist,Fij;
      ///For each boundary line
      while(aI < nArcs){
        nArcVertices=projectedArcs[aI].length;
        vI=0;
        ///For each coordinate pair
        while(vI < nArcVertices){
          // create an array of vectors: [x, y]
          delta = [0,0];
          nPolygon = meta.length;
          pI=0;
          ///For each polygon centroid
          while(pI < nPolygon) {
            centroid =  meta[pI].centroid;
            mass =      meta[pI].mass;
            radius =    meta[pI].radius;
            rSquared = (radius*radius);
            dx = projectedArcs[aI][vI][0] - centroid[0];
            dy = projectedArcs[aI][vI][1] - centroid[1];
            distSquared = dx * dx + dy * dy;
            dist=Math.sqrt(distSquared);
            if (dist < meta[pI].range){
              Fij = (dist > radius)
              ? mass * radius / dist
              : mass *
              (distSquared / rSquared) *
              (4 - 3 * dist / radius);
              var tans = Helpers.arctans(dy, dx)
              delta[0]+=(Fij * tans.cos);
              delta[1]+=(Fij * tans.sin);
            }
            pI++;
          }
          projectedArcs[aI][vI][0] += (delta[0]*forceReductionFactor);
          projectedArcs[aI][vI][1] += (delta[1]*forceReductionFactor);
          vI++;
        }
        aI++;
      }

      // break if we hit the target size error
      if (sizeError <= 1) break;
    }

    //console.timeEnd("processing:" + task)

    var response = {
      done: 'processing',
      //geohson featureCollection
      features: objects,
      //arcs can be useful to reconstruct topojson :
      //arcs: projectedArcs,
      task: task
    }

    if (typeof self !== 'undefined'){
      self.postMessage(response)
    } else {
      this.onmessage(response)
    }
  }
}

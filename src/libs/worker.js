
//Use a partial d3 build
//https://github.com/mbostock/smash/wiki
require('./d3.geo/d3f.js')

var transformer = function(tf) {
  var kx = tf.scale[0],
  ky = tf.scale[1],
  dx = tf.translate[0],
  dy = tf.translate[1];

  function transform(c) {
    return [c[0] * kx + dx, c[1] * ky + dy];
  }

  transform.invert = function(c) {
    return [(c[0] - dx) / kx, (c[1]- dy) / ky];
  };

  return transform;
};

onmessage = function(event) {
  if (event.data.do === 'carto'){
    var data = event.data.data
    var topology = data.topology,
        geometries = data.geometries,
        path = data.path,
        x = data.anchorSize.x,
        y = data.anchorSize.y,
        year = data.year,
        values = data.values;


    // copy it first
    topology = copy(topology);

    // objects are projected into screen coordinates
    // project the arcs into screen space

    //TODO temporary
    var projection = d3f.geo.mercator()
    //.center([0, 0])
    .scale(y)
    .translate([0.43 * x, 1.35 * y])


    var tf = transformer(topology.transform),x,y,nArcVertices,vI,out1,nArcs=topology.arcs.length,aI=0,
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

    var objects = object(projectedArcs, {type: "GeometryCollection", geometries: geometries})
    .geometries.map(function(geom) {
      return {
        type: "Feature",
        id: geom.id,
        properties: properties.call(null, geom, topology),
        geometry: geom
      };
    });

    //TODO temporary
    value = function(d){
      return values[d.properties.iso_a3]
    }

    var values = objects.map(value),
      totalValue = values.reduce(function(a,b){return a + b;});

    var iterations = 8;

    var i = 0;
    while (i++ < iterations) {
      var areas = objects.map(path.area),
      totalArea = areas.reduce(function(a,b){return a + b}),
      sizeErrorsTot = 0,
      sizeErrorsNum = 0,

      ///for i = 1 to n do
      meta = objects.map(function(o, j) {
        var area = Math.abs(areas[j]), // XXX: why do we have negative areas?
        v = +values[j],
        ///Compute AD i , the desired area of the ith cell
        desired = totalArea * v / totalValue,
        radius = Math.sqrt(area / Math.PI),
        mass = Math.sqrt(desired / Math.PI) - radius,
        sizeError = Math.max(area, desired) / Math.min(area, desired);
        sizeErrorsTot+=sizeError;
        sizeErrorsNum++;
        // console.log(o.id, "@", j, "area:", area, "value:", v, "->", desired, radius, mass, sizeError);
        return {
          id:         o.id,
          area:       area,
          centroid:   path.centroid(o),
          value:      v,
          desired:    desired,
          range: 100 * (Math.abs(desired - area)) / (Math.sqrt(Math.PI * area)),
          radius:     radius,
          mass:       mass,
          sizeError:  sizeError
        };
      });

      var sizeError = sizeErrorsTot/sizeErrorsNum,
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
              delta[0]+=(Fij * cosArctan(dy,dx));
              delta[1]+=(Fij * sinArctan(dy,dx));
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

    self.postMessage({
      done: 'processing',
      features: objects,
      arcs: projectedArcs,
      year: year
    })
  }
}

function copy(o) {
  return (o instanceof Array)
  ? o.map(copy)
  : (typeof o === "string" || typeof o === "number")
  ? o
  : copyObject(o);
}

function copyObject(o) {
  var obj = {};
  for (var k in o) obj[k] = copy(o[k]);
  return obj;
}

function cosArctan(dx,dy){
  var div = dx/dy;
  return (dy>0)?
  (1/Math.sqrt(1+(div*div))):
  (-1/Math.sqrt(1+(div*div)));
}

function sinArctan(dx,dy){
  var div = dx/dy;
  return (dy>0)?
  (div/Math.sqrt(1+(div*div))):
  (-div/Math.sqrt(1+(div*div)));
}

function object(arcs, o) {
  function arc(i, points) {
    if (points.length) points.pop();
    for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
      points.push(a[k]);
    }
    if (i < 0) reverse(points, n);
  }

  function line(arcs) {
    var points = [];
    for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
    return points;
  }

  function polygon(arcs) {
    return arcs.map(line);
  }

  function geometry(o) {
    o = Object.create(o);
    o.properties = o.properties;
    o.coordinates = geometryType[o.type](o.arcs);
    //type is in o's prototype, which will be lost by worker.postMessage
    o.type = o.type
    return o;
  }
  var geometryType = {
    LineString: line,
    MultiLineString: polygon,
    Polygon: polygon,
    MultiPolygon: function(arcs) { return arcs.map(polygon); }
  };

  return o.type === "GeometryCollection"
  ? (o = Object.create(o), o.geometries = o.geometries.map(geometry), o)
  : geometry(o);
}


function reverse(array, n) {
  var t, j = array.length, i = j - n; while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
}

function properties(obj) {
  return obj.properties || {};
}

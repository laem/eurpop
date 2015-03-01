var Helpers = {}

Helpers.copy = function(o) {
  return (o instanceof Array)
  ? o.map(Helpers.copy)
  : (typeof o === "string" || typeof o === "number")
  ? o
  : copyObject(o);
}

function copyObject(o) {
  var obj = {};
  for (var k in o) obj[k] = Helpers.copy(o[k]);
  return obj;
}

//Grouping cosArctan and sinArctan (see below)
Helpers.arctans = function(dx, dy){
  var div = dx/dy,
      sqrt = Math.sqrt(1+(div*div)),
      signedSqrt = (dy > 0) ? sqrt : -sqrt,
      cos = 1 / signedSqrt,
      sin = div * cos;

  return {
    cos: cos,
    sin: sin
  }
}

/*

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

*/

Helpers.object = function(arcs, o) {
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

Helpers.properties = function(obj) {
  return obj.properties || {};
}

Helpers.transformer = function(tf) {
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

module.exports = Helpers

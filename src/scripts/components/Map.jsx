/**
 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');
require('../../styles/Map.css');
require('../../libs/d3.v3.min.js')
var topojson = require('../../libs/topojson.v1.min.js')
require('../../libs/cartogram.js')
var data = require('json!../../data/lala.json')

var Map = React.createClass({
  getInitialState: function(){
    return {}
  },
  render: function () {
    return (
        <div id="playground">
          <p>You're broken ):</p>
          <div className="log">{this.state.log}</div>
        </div>
      );
  },

  componentDidMount: function () {
    /*this.setState({
      log: data
    })*/
    var width = 1800,
        height = 950;

    var cartogram = d3.cartogram()
      .projection(d3.geo.mercator()
        .center([0.3, 60])
        .scale(800)
        //.translate([width / 2, height / 2])
      )
      .value(function(d) {
        return 1 - Math.random() / 2;
      });

    var projection = d3.geo.mercator()
        // .rotate([0, 0])
        .center([10.3, 50])
        .scale(700)
        .translate([width / 2, height / 2])
        // .precision(.1);

    var path = d3.geo.path().projection(projection),
        force = d3.layout.force().size([width, height]);

    var svg = d3.select("#playground").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Select european geometries only
    var pays = ['AUT', 'BEL', 'BGR', 'CYP', 'CZE', 'DNK']
    pays = pays.concat(['EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'GBR']);
    data.objects.admin0.geometries = data.objects.admin0.geometries.filter(function(geometry) {
       if (pays.indexOf(geometry.properties.iso_a3) > -1) {
           return true
         }
    })


    // Get the GeoJSON from our filtered topoJSON
    var states = topojson.feature(data, data.objects.admin0);

    var nodes = [],
        links = [];

    states.features.forEach(function(d, i) {
      var centroid = path.centroid(d);
      if (centroid.some(isNaN)) return;
      centroid.x = centroid[0];
      centroid.y = centroid[1];
      centroid.feature = d;
      nodes.push(centroid);
    });

    d3.geom.voronoi().links(nodes).forEach(function(link) {
      var dx = link.source.x - link.target.x,
          dy = link.source.y - link.target.y;
      link.distance = Math.sqrt(dx * dx + dy * dy);
      links.push(link);
    });

    force
        .gravity(0)
        .nodes(nodes)
        .links(links)
        .linkDistance(function(d) { return d.distance; })
        .start();

    var link = svg.selectAll("line")
        .data(links)
      .enter().append("line")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    var node = svg.selectAll("g")
        .data(nodes)
      .enter().append("g")
        .attr("transform", function(d) { return "translate(" + -d.x + "," + -d.y + ")"; })
        .call(force.drag)
      .append("path")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("d", function(d) { return path(d.feature); });

    force.on("tick", function(e) {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      })
    });
  }
});

module.exports = Map;

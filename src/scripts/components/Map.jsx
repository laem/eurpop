/**
 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');
require('../../libs/d3.v3.min.js')
var Miso = require("miso.dataset");
//require('../../libs/miso.ds.deps.0.4.1.js')
//require('../../../node_modules/miso.dataset/dist/miso.ds.deps.0.4.1.js')

require('../../styles/Map.css');

var topojson = require('../../libs/topojson.v1.min.js')
require('../../libs/cartogram.js')
var data = require('json!../../data/lala.json')
//TODO
// Rang des pays se transmet
//Go get data from http://databank.worldbank.org
//Put them in a google spreadsheet

var ds = new Miso.Dataset({
  importer : Miso.Dataset.Importers.GoogleSpreadsheet,
  parser : Miso.Dataset.Parsers.GoogleSpreadsheet,
  key : "0Asnl0xYK7V16dFpFVmZUUy1taXdFbUJGdGtVdFBXbFE",
  worksheet : "1"
});

ds.fetch({
  success : function() {
    console.log(ds.columnNames());
  },
  error : function() {
    console.log("Are you sure you are connected to the internet?");
  }
});


var Map = React.createClass({
  getInitialState: function(){
    return {
      indicator: 'pop'
    }
  },
  render: function () {
    return (
        <div className="centered">
          <h1>Europe's {this.state.indicator}</h1>
          <div ref="playground">
          </div>
          <button onClick={this.toggle}>Toggle indicator</button>
        </div>
      );
  },

  toggle: function(){
    var newState = this.state.indicator === 'pop' ? 'area' : 'pop'
    this.setState({
      indicator: newState
    })
  },

  componentDidMount: function(){
    this.componentDidUpdate()
  },

  componentDidUpdate: function () { var _this = this

    var width = 1800,
        height = 950;

    var playground = this.refs.playground.getDOMNode()
    playground.innerHTML = ''

    var svg = d3.select(playground).append("svg")
        .attr("width", width)
        .attr("height", height);

    // Select european geometries only
    //var pays = ['AUT', 'BEL', 'BGR', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA']
    //pays = pays.concat([ 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'GBR']);
    //Just a few for now
    return
    var pays = ['FRA', 'ESP', 'DEU', 'GBR', "ITA", "CHE"]
    var measures = ['population', 'area']
    var years = [2014, 2015, 2016, 2017, 2018, 2019, 2020]

    var facts = {
      area: {'FRA': 547030.0, 'ESP': 504782.0, 'DEU': 357021.0, 'GBR': 244820.0, 'ITA': 301230.0, 'CHE': 41290.0 },
      pop: {'FRA': 64768389, 'ESP': 46505963, 'DEU': 81802257, 'GBR': 62348447, 'ITA': 60340328, 'CHE': 7581000 }
    }

    data.objects.admin0.geometries = data.objects.admin0.geometries.filter(function(geometry) {
       var code = geometry.properties.iso_a3
       if (pays.indexOf(code) > -1) {
            geometry.properties.indicator = facts[_this.state.indicator][code]
            return true
         }
    })


    /* Get the GeoJSON from our filtered topoJSON */

    /* this is the original data
    var projection = d3.geo.mercator()
        .center([10.3, 50])
        .scale(1000)
        .translate([width / 2, height / 2])
        // .precision(.1);

    var path = d3.geo.path().projection(projection)

    var states = topojson.feature(data, data.objects.admin0);
    */

    /* this is the cartogrammed version */
    var cartogram = d3.cartogram()
      .projection(d3.geo.mercator()
        .center([-15, 55])
        .scale(1200)
        //.translate([width / 2, height / 2])
      )
      .value(function(d) {
        return d.properties.indicator
        //return 1 - Math.random() / 2;
      });

    var states = cartogram(data, data.objects.admin0.geometries);
    var path = cartogram.path

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

    var force = d3.layout.force().size([width, height]);

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

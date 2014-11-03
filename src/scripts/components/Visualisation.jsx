/**
 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');
require('../../libs/d3.v3.min.js')
var colorbrewer = require('../../libs/colorbrewer.js')

require('../../styles/visualisation.css');

var topojson = require('../../libs/topojson.v1.min.js')
require('../../libs/cartogram.js')

var topojsonData = require('json!../../data/lala.json')

var Dragdealer = require('../../libs/dragdealer.js')
//Go get data from http://databank.worldbank.org
//Put them in a google spreadsheet

var Map = React.createClass({
  getInitialState: function(){
    return {
      year: 1960,
      population: null, // datasets
      fertility: null // datasets
    }
  },
  render: function () {
    return (
        <div className="centered">
          <div id="year">
            <span>
              {this.state.year}
            </span>
          </div>

          <h1>A map of europeans</h1>
          <div id="dragContainer">
            <div className="dragdealer" id="timeSlider">
              <div ref="timeHandle" className="handle red-bar">{this.state.year}</div>
            </div>
          </div>
          <div id="playground" ref="playground" style={{display: 'block'}}>
          </div>
          <div className="legendBlock">
            <h3>Country colors show the <em>fertility rate</em></h3>
            <ul id="legend"></ul>
          </div>



        </div>
      );
  },

  prepareData: function(){
    // Select all european geometries
    //var pays = ['AUT', 'BEL', 'BGR', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA']
    //pays = pays.concat([ 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'GBR']);

    /* Only some of them */
    var pays = ['FRA', 'ESP', 'DEU', 'GBR', "ITA", "CHE"]
    //var area = {'FRA': 547030.0, 'ESP': 504782.0, 'DEU': 357021.0, 'GBR': 244820.0, 'ITA': 301230.0, 'CHE': 41290.0 }

    this.topojsonData = topojsonData

    this.topojsonData.objects.admin0.geometries = topojsonData.objects.admin0.geometries.filter(function(geometry) {
       var code = geometry.properties.iso_a3
       return pays.indexOf(code) > -1
    })

  },

  /* metric should be 'population' or 'fertility' */
  getCountryMeasure: function(metric, code){
    var countries = this.props[metric].column(['Country Code']).data
    var index = countries.indexOf(code)
    var measure = this.props.population.column([this.state.year]).data[index]
    return measure
  },

  componentDidMount: function(){
    this.prepareData()
    this.componentDidUpdate()
    new Dragdealer('timeSlider',{
      steps: 30,
      animationCallback: this.timeChanged
    });
  },

  timeChanged: function(x, y){
    var timeHandle = this.refs.timeHandle.getDOMNode()
    this.setState({year: 1960 + Math.round(x * 90)})
  },

  componentDidUpdate: function () {
    var _this = this

    if (!this.props.population || !this.props.fertility) return;

    console.log('goooooooooo')
    var width = 1800,
        height = 850;

    var playground = this.refs.playground.getDOMNode()
    playground.innerHTML = ''

    var svg = d3.select(playground).append("svg")
        .attr("width", width)
        .attr("height", height);


    /* Get the GeoJSON from our filtered topoJSON */

    /* 1 this is the original data
    var projection = d3.geo.mercator()
        .center([10.3, 50])
        .scale(1000)
        .translate([width / 2, height / 2])
        // .precision(.1);

    var path = d3.geo.path().projection(projection)

    var states = topojson.feature(topojson, topojson.objects.admin0);
    */

    /* 2 this is the cartogrammed version */
    var start = new Date().getTime();

    var cartogram = d3.cartogram()
      .projection(d3.geo.mercator()
        .center([-15, 53])
        .scale(1200)
        //.translate([width / 2, height / 2])
      )
      .value(function(d) {
        var value = _this.getCountryMeasure('population', d.properties.iso_a3)
        return value
      });

    var states = cartogram(this.topojsonData, this.topojsonData.objects.admin0.geometries);

    var path = cartogram.path

var end = new Date().getTime();
console.log('ça a pris : ', end-start)


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

    /* Legend.
    See http://eyeseast.github.io/visible-data/2013/08/27/responsive-legends-with-d3/
     */
    var colors = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[7])
    .domain([1, 2.1])

    var legend = d3.select('#legend')
    legend.selectAll('*').remove()

    var keys = legend.selectAll('li.key')
        .data(colors.range());

    keys.enter().append('li')
        .attr('class', 'key')
        .style('border-top-color', String)
        .text(function(d) {
            var r = colors.invertExtent(d);
            //return formats.percent(r[0]);
            return  d3.format('.2f')(r[0])
        });

    /* Force map */

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
        .attr("d", function(d) { return path(d.feature); })
        .style('fill', function(d){
          var code = d.feature.properties.iso_a3

          var countries = _this.props.fertility.column(['Country Code']).data
          var index = countries.indexOf(code)
          var measure = _this.props.fertility.column([_this.state.year]).data[index]
          measure = parseFloat(measure.replace(',', '.'))

          return colors(measure)
        })

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

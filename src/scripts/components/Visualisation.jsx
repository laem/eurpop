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
/* Country shapes, will be used to draw the map */
var topojsonData = require('json!../../data/lala.json')
var frmttr = require('frmttr')()

/* Used for the time slider */
var Dragdealer = require('../../libs/dragdealer.js')

var Visualisation = React.createClass({
  getInitialState: function(){
    return {
      year: 1960,
      focus: null
    }
  },
  render: function () {
    var message = <p className="info">Hover over countries for figures</p>,
        focus = this.state.focus;
    if (focus != null){
      var name = this.getCountryName(focus)
      var population = this.getCountryMeasure('population', focus)

      var year = new Date().getFullYear(),
        verb = this.state.year > year ? 'will have' : 'had',
        pop = frmttr(population);

      message = <p>
                  {name} {verb}
                  <span title={pop.alt}> {pop.regular} </span>
                  citizens in {this.state.year}
              </p>
    }
    return (
        <div className="centered">

          <h1>A map of europeans</h1>
          <div id="dragContainer">
            <div className="dragdealer" id="timeSlider">
              <div ref="timeHandle" className="handle red-bar">{this.state.year}</div>
            </div>
          </div>
          <div  id="playground" ref="playground"
                data-comment="the map or bar chart will be drawn here"
          ></div>
          <div className="legendBlock">
            {message}
            <h3>Colors show the <em>fertility rate</em></h3>
            <ul id="legend"></ul>
          </div>

        </div>
      );
  },

  prepareData: function(){
    // Select all 28 european geometries (grouped for testing)
    var pays = ["FRA", "ESP", "GBR", "ITA", "PRT", "CHE", "IRL", "BEL", "LUX"]
    pays = pays.concat(["NLD", "DEU", "AUT", "HUN", "POL", "CZE", "DNK" ])
    // Sorry northern countries, the screen's to small for you...
    //pays = pays.concat(["SWE", "EST", "FIN", "LTU", "LVA"])
    pays = pays.concat(["GRC", "CYP"]) // no geometry for "MLT" :-(
    pays = pays.concat(["ROU", "BGR", "HRV", "SVN", "SVK"])

    this.topojsonData = topojsonData

    this.topojsonData.objects.admin0.geometries = topojsonData.objects.admin0.geometries.filter(function(geometry) {
       var code = geometry.properties.iso_a3
       return pays.indexOf(code) > -1
    })

    /* Cartogram paths will be cached,
    not avoid recomputing everything for each year change */
    this.cache = { 1960: null}

  },

  /* metric should be 'population' or 'fertility' */
  getCountryMeasure: function(metric, code){
    var countries = this.props[metric].column(['Country Code']).data
    var index = countries.indexOf(code)
    return this.props.population.column([this.state.year]).data[index]
  },

  getCountryName: function(code){
    var countries = this.props['population'].column(['Country Code']).data
    var index = countries.indexOf(code)
    return this.props.population.column(['Country Name']).data[index]
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
    this.setState({year: 1960 + Math.round(x * 90)})
  },

  componentDidUpdate: function () {
    var _this = this

    /* Wait for data */
    if (!this.props.population || !this.props.fertility) return;

    var playground = this.refs.playground.getDOMNode()
    var drawnYear = playground.dataset.year
    if (drawnYear == this.state.year){
      return
    } else {
      playground.dataset.year = this.state.year
    }

    console.log('goooooooooo')

    var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0]

    var svg;

    window.onresize = function(){
      _this.cache = {} // flush the cartogram cache
      console.log('cache flushed')
      draw()
    };

    draw()

    function draw(){
      var x = w.innerWidth || e.clientWidth || g.clientWidth;
      var y = w.innerHeight|| e.clientHeight|| g.clientHeight;
      if (x * y == 0) return;

      playground.innerHTML = ''
      svg = d3.select(playground).append("svg")
      svg.attr("width", x).attr("height", y - 250);

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
      var start = new Date().getTime(), end;

// for scaling, http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object

      var cartogram, states, year = _this.state.year;
      if (_this.cache[year]){
        cartogram = _this.cache[year].cartogram
        states = _this.cache[year].states
      } else {
        cartogram = d3.cartogram()
          .projection(d3.geo.mercator()
          //.center([0, 0])
          .scale(y)
          .translate([0.43 * x, 1.35 * y])
        )
        .value(function(d) {
          var value = _this.getCountryMeasure('population', d.properties.iso_a3)
          return value
        });

        states = cartogram(_this.topojsonData, _this.topojsonData.objects.admin0.geometries);

        _this.cache[year] = {cartogram: cartogram, states: states}
      }

      var path = cartogram.path

      end = new Date().getTime();
      console.log('ça a pris : 2', end-start)


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
      .domain([1., 2.1])

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

      var lines = svg.append('g').attr('class', 'lines')

      var link = lines.selectAll("line")
          .data(links)
        .enter().append("line")
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      var nodeGroup = svg.append('g').attr('class', 'nodes')

      var node = nodeGroup.selectAll("g")
          .data(nodes)
        .enter().append("g")
          .attr("transform", function(d) { return "translate(" + -d.x + "," + -d.y + ")"; })
          .on('mouseover', function(d){
            _this.setState({focus: d.feature.properties.iso_a3})
          })
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
    }


  }
});

module.exports = Visualisation;

/**

This React component displays some divs around the maps,
and calls cartogram web workers to compute projections of europe for every year from @from to @to.
Yes it should be splitted.

 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');
require('../../libs/d3.js')
var _ = require('underscore.deferred')

var colorbrewer = require('../../libs/colorbrewer.js')

require('../../styles/visualisation.css');

var topojson = require('../../libs/topojson.v1.min.js')
//require('../../libs/cartogram_eurpop.js')
var cartogwam = require('../../libs/cartogwam.js')
/* Country shapes, will be used to draw the map */
var topojsonData = require('json!../../data/lala.json')
var frmttr = require('frmttr')()

/* Used for the time slider */
var Dragdealer = require('../../libs/dragdealer.js')

var from = 1960,
    to = 2050,
    span = to - from + 1;


var Visualisation = React.createClass({
  getInitialState: function(){
    return {
      year: from,
      focus: null,
      processed: false,
      trueMap: false
    }
  },
  render: function () {
    var year = new Date().getFullYear()

    var message = <p className="info">(Hover over a country to track its population)</p>,
        focus = this.state.focus;
    if (focus != null){
      var name = this.getCountryName(focus)
      var population = this.getCountryMeasure('population', focus, this.state.year)


      var verb = this.state.year > year ? 'could have' : 'had',
          pop = frmttr(population);

      message = <p>
                  {name} {verb}
                  <span title={pop.alt}> {pop.regular} </span>
                  citizens in {this.state.year}
              </p>
    }
    var slideClass = this.state.year > year ? 'handle red-bar estimate' : 'handle red-bar'
    var handleClass =
      this.state.processed  ?
        (this.state.year > year ? 'fa fa-angle-double-right ' : 'fa fa-long-arrow-right')
                            :
        'fa fa fa-cog fa-spin';

    return (
        <div className={"centered " + this.props.intro}>
          <div className="hiddenForIntro">
            <h1 id="title" >A map of europeans in <span id="chosenYear">{this.state.year}</span></h1>
            <div id="dragContainer">
              <div className="dragdealer" id="timeSlider">
                <div ref="timeHandle" className={slideClass}>
                  <i className={handleClass}></i>
                </div>
              </div>
            </div>
          </div>
          <div  id="playground"
                ref="playground"
                data-comment="the map or bar chart will be drawn here"
          ></div>
          <div className="legendBlock hiddenForIntro">
            {message}
            <h3><em>Fertility rate</em></h3>
            <ul id="legend"></ul>
          </div>
          <div
              id="trueMap"
              onMouseOver={this.switchCartoGeo}
              onMouseOut={this.switchCartoGeo}
              className="hiddenForIntro">
            <p>Back</p>
            <i className="fa fa-globe"></i>
            <p>to reality</p>
          </div>
          <a className="hiddenForIntro" href="https://github.com/laem/eurpop" target="_blank" id="info">
            <i className="fa fa-git" title="Fork me"></i>
          </a>

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

  },

  /* metric should be 'population' or 'fertility' */
  getCountryMeasure: function(metric, code, year){
    var countries = this.props[metric].column(['Country Code']).data
    var index = countries.indexOf(code)
    return this.props.population.column([year]).data[index]
  },

  // Get an object of countryId: metric pairs for a given metric and year
  getValuesForYear: function(metric, year){
    var countries = this.props[metric].column(['Country Code']).data
    var data = this.props.population.column([year]).data
    //zip these two collections
    var result = {}
    countries.forEach(function(c, i){
      result[c] = data[i]
    })
    return result
  },

  getCountryName: function(code){
    var countries = this.props['population'].column(['Country Code']).data
    var index = countries.indexOf(code)
    return this.props.population.column(['Country Name']).data[index]
  },

  componentDidMount: function(){
    this.prepareData()
    this.componentDidUpdate()
    this.dragdealer = new Dragdealer('timeSlider',{
      steps: 30,
      animationCallback: this.timeChanged,
      disabled: true
    });
  },

  timeChanged: function(x, y){
    this.setState({year: from + Math.round(x * (span - 1))})
  },

  switchCartoGeo: function(){
    this.setState({trueMap: !this.state.trueMap})
  },

  componentDidUpdate: function (prevProps, prevState) {
    var _this = this

    /* Wait for data */
    if (!this.props.population || !this.props.fertility) return;

    var switchCartoGeo = prevState.trueMap != this.state.trueMap

    var playground = this.refs.playground.getDOMNode()
    var drawnYear = playground.dataset.year
    if (drawnYear == this.state.year && !switchCartoGeo){
      return
    } else {
      playground.dataset.year = this.state.year
    }

    var w = window,
    d = document,
    e = d.documentElement,
    g = d.getElementsByTagName('body')[0]

    var svg;

    window.onresize = function(){
      _this.cache = {} // flush the cartogram cache
      draw()
    };

    draw()

    function draw(){
      // for scaling, http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
      var x = w.innerWidth || e.clientWidth || g.clientWidth;
      var y = w.innerHeight|| e.clientHeight|| g.clientHeight;
      if (x * y == 0) return;

      var states, year = _this.state.year;
debugger;
      //Pre-compute the map for every year.
      //Web workers will prevent the browser from freezing
      if (!_this.cache || _this.cache[from] == null) {
        //Compute the first year
        computePaths(from, from)
        //DIsable the slider
        _this.dragdealer.disable()
        //Compute the other years, then enable the slider (enableDragdealer == true)
        computePaths(from, to, true)
      } else { //The cache exists, just draw
        drawCartogram()
      }

      function computePaths(f, t, enableDragdealer){
        console.time('processing')

        var values = {}
        //for each year
        for (var year = f; year <= t; year++){
          //map of featureId -> area
          values[year] = _this.getValuesForYear('population', year)
        }

        var promiseOfGeos = cartogwam({
          topology: _this.topojsonData,
          geometries: _this.topojsonData.objects.admin0.geometries,
          anchorSize: {x: x, y: y}
        }, values);

        promiseOfGeos.progress(function(value){
          document.querySelector('#timeSlider').style.width = Math.round(value * 100) + "%"
        })

        promiseOfGeos.then(function(a){
          _this.cache = a
          console.timeEnd('processing')
          drawCartogram()
          if (enableDragdealer){
            _this.setState({processed: true})
            document.querySelector('#timeSlider').style.width = "100%"
            _this.dragdealer.enable()

          }
        }).fail(function( err ){
          console.log(err.message); // "Oops!"
        });
      }

      function drawCartogram(){

        playground.innerHTML = ''
        svg = d3.select(playground).append("svg")
        svg.attr("width", x).attr("height", y - 250);

        var path, states;
        if (_this.state.trueMap){
          // Show the real geographical map

          var projection = d3.geo.mercator()
          //.center([0, 0])
          .scale(y)
          .translate([0.43 * x, 1.35 * y])

          path = d3.geo.path().projection(projection)
          states = topojson.feature(_this.topojsonData, _this.topojsonData.objects.admin0);
        } else {
          //Draw the population cartogram with cached data
          states = _this.cache[_this.state.year]

          // path with identity projection
          path = d3.geo.path()
          .projection(null);
        }

        var nodes = [],
        links = [];

        states.features.forEach(function(d, i) {
          var centroid = path.centroid(d);
          if (centroid.some(isNaN)) {
            return;
          }
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
          var code = d.feature.properties.iso_a3,
          y = _this.state.year;

          var countries = _this.props.fertility.column(['Country Code']).data
          var index = countries.indexOf(code)

          function getMeasure(yyyy){
            return _this.props.fertility.column([yyyy]).data[index]
          }
          var measure = getMeasure(y)
          while (measure === ".."){ //NaN : estimates can span half decades.
            y --;
            measure = getMeasure(y)
          }
          measure = parseFloat(measure.replace(',', '.'))

          return colors(measure)
        })
      }

      }
    }

});

module.exports = Visualisation;

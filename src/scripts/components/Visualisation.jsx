/**

This React component displays some divs around the maps,
and calls cartogram web workers to compute projections of europe for every year from @from to @to.
Yes it should be splitted.

 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');
require('d3')
var _ = require('underscore.deferred')

var colorbrewer = require('../../libs/colorbrewer.js')

require('../../styles/visualisation.css');

var topojson = require('topojson')
var cartogramaster = require('../../libs/cartogram/cartogramaster.js')

/* Country shapes, will be used to draw the map.
Can be computed with wbeworkers or just loaded from an offline preprocessing.
> See the prepareData method */
var topojsonData = require('json!../../data/lala1.json'),
    preprocessedData = require('json!../../data/reshapedEurope.json');

var frmttr = require('frmttr')

var HBar = require('babel!react-horizontal-bar-chart')
require('../../styles/hbar.css')
var formatter = (value) => frmttr()(value).regular;


/* Used for the time slider */
var Dragdealer = require('dragdealer')

var from = 1960,
    to = 2050,
    span = to - from + 1;


var Visualisation = React.createClass({
  getInitialState: function(){
    return {
      year: from,
      focus: null,
      processed: false,
      trueMap: false,
      barsPlease: false,
      handleDiscovery: ' pulse' //className
    }
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

  /*********************************
   State changing methods */

  timeChanged: function(x, y){
    this.setState({year: from + Math.round(x * (span - 1))})
  },

  switchCartoGeo: function(){
    this.setState({trueMap: !this.state.trueMap})
  },

  switchVisMode: function(){
    this.setState({barsPlease: !this.state.barsPlease})
  },

  handleDiscovered: function(){
    if (this.state.handleDiscovery === ' pulse'){
        this.setState({handleDiscovery: ' hint'})
        setTimeout(() => this.setState({ handleDiscovery: ''}), 3000)
    }

  },

  /*******************
   Rendering methods */

  render: function () {
    var year = new Date().getFullYear()

    var message = <p className="info">(Hover over a country to track its population)</p>,
        focus = this.state.focus;
    if (focus != null){
      var name = this.getCountryName(focus)
      var population = this.getCountryMeasure('population', focus, this.state.year)
      var fertility = this.getLastKnownMeasure('fertility', focus, this.state.year)


      var verb = this.state.year > year ? 'could have' : 'had',
          pop = frmttr()(population);

      message = (
        <p>
          <span id="countryName">{name}</span> {verb}
          <span title={pop.alt}> {pop.regular} </span>
          citizens in {this.state.year}, <br/>
          a fertility rate of
          <span> {fertility} </span>
        </p>
      )
    }
    var slideClass = this.state.year > year ? 'handle red-bar estimate' : 'handle red-bar'
    var handleIconClass =
      this.state.processed || this.state.barsPlease  ?
        (this.state.year > year ? 'fa fa-angle-double-right ' : 'fa fa-long-arrow-right')
                            :
        'fa fa-cog fa-spin';

    var barsMode = this.state.barsPlease ? ' barsMode' : ''

    return (
        <div className={"centered " + this.props.intro + barsMode}>
          <div className="hiddenForIntro">
            <div id="dragContainer">
              <div className="dragdealer" id="timeSlider">
                <div ref="timeHandle" className={slideClass + this.state.handleDiscovery} onMouseOver={this.handleDiscovered}>
                  <i className={handleIconClass}></i>
                </div>
              </div>
            </div>
          </div>
          <div
            id="playground"
            ref="playground"
            data-comment="the map or bar chart will be drawn here">
            {
              this.state.barsPlease ?
                this.renderBars() : <div ref="mapPlayground" id="mapPlayground"></div>
            }
          </div>

          <div id="legendBlock" className="hiddenForIntro disabledWhenBars">
            {message}
            <ul id="legend"></ul>
          </div>

          <div id="titleBlock" className="hiddenForIntro">
            <h1 id="title">
              {this.state.barsPlease ? "Europeans in" : "A map of europeans in"} <span id="chosenYear">{this.state.year}</span>
            </h1>
          </div>



          <div className="actions">
            <div
                id="trueMap"
                onMouseOver={this.switchCartoGeo}
                onMouseOut={this.switchCartoGeo}
                className="action hiddenForIntro disabledWhenBars">
              <i className="fa fa-globe"></i>
              <p>Back to reality</p>
            </div>
            <div
                id="visMode"
                onClick={this.switchVisMode}
                className="action hiddenForIntro">
              <i className={this.state.barsPlease ? "fa fa-undo" : "fa fa-bar-chart"}></i>
              <p>{this.state.barsPlease ? 'Back to map': 'Ranking view'}</p>
            </div>
          </div>

          <a className="hiddenForIntro" href="https://github.com/laem/eurpop" target="_blank" id="info">
            <i className="fa fa-git" title="Fork me"></i>
          </a>

        </div>
      );
  },

  componentDidUpdate: function (prevProps, prevState) {

    // Do not react if the visualisation data yet isn't available yet
    if (!this.props.population || !this.props.fertility) return;

    var mapPlayground = this.refs.mapPlayground,
        yearChanged = prevState.year !== this.state.year,
        switchCartoGeo = prevState.trueMap != this.state.trueMap,
        switchBarsMap = prevState.barsPlease != this.state.trueMap;


    if (mapPlayground != undefined){
      if (  yearChanged || switchCartoGeo || switchBarsMap
            || mapPlayground.getDOMNode().innerHTML === "" ){
        this.renderMap(mapPlayground)
      } else {
        // Neither the year, the map type (real boundaries vs cartogram),
        // and the visualisation type (map or bars) has changed
        // => do not rerender the map
      }
    }
  },

  renderBars: function(){
    if (!this.state.barsPlease || !this.props.population) return;

    this.dragdealer.enable()

    var values = this.getValuesForYear('population', this.state.year)
    // values should be an array of {v: 18, label: "Joseph"} objects
    var data = Object.keys(values).map(id => {
      var value = values[id]
      var name = this.getCountryName(id)
      return {
          v: value,
          label: name
      }
    })

    var mapColors = colorbrewer.RdYlGn[7]

    return (
      <HBar
        data={data}
        width={window.screen.availWidth * 2 / 3}
        height={window.screen.availHeight - 230}
        sort="descending"
        formatter={formatter}
        flash="true"
        barColor={mapColors[mapColors.length - 1]}
      />
    )

  },

  renderMap: function(){
    var _this = this,
        svg;

    function newBrowserSize(){
      var [x, y] = _this.getWindowDimensions();
      if (x * y == 0) return;
      d3.select("#leSVG").attr("height", y - 140)
    }

    window.onresize = newBrowserSize

    draw()

    function draw(){

      /* Fixed to the highest common resolution at the time of writing,
         since shapes can also be computed offline without screen resolution
         knowledge
      */
      var maxX = 1920 //window.screen.availWidth
      var maxY = 1080 //window.screen.availHeight

      var year = _this.state.year;

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
        _this.dragdealer.enable()
      }

      function computePaths(f, t, enableDragdealer){

        var values = {}
        //for each year
        for (var year = f; year <= t; year++){
          //map of featureId -> area
          values[year] = _this.getValuesForYear('population', year)
        }
        var promiseOfGeos = cartogramaster({
            topology: _this.topojsonData,
            geometries: _this.topojsonData.objects.admin0.geometries,
            projection: {
              name: 'mercator',
              translation: [0.35 * maxX, 1.95 * maxY], //topojson-specific I guess
              scaling: maxY * 1.5 //topojson-specific I guess
            }
          },
          values,
          'iso_a3'
        );

        promiseOfGeos.progress(function(value){
          document.querySelector('#timeSlider').style.width = Math.round(value * 100) + "%"
        })

        promiseOfGeos.then(function(a){
          _this.cache = a
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

        mapPlayground.innerHTML = ''
        svg = d3.select(mapPlayground).append("svg").attr("id", "leSVG")
        newBrowserSize()
        svg.attr("viewBox", "0 0 " + maxX + " " + maxY)

        var path, featureCollection;
        if (_this.state.trueMap){
          // Show the real geographical map

          //TODO what's that projection for ?
          var projection = d3.geo.mercator()
          //.center([0, 0])
          .scale(maxY * 1.5)
          .translate([0.35 * maxX, 1.95 * maxY])

          path = d3.geo.path().projection(projection)
          //convert to geojson
          featureCollection = topojson.feature(_this.topojsonData, _this.topojsonData.objects.admin0);
        } else {
          //Draw the population cartogram with cached data
          featureCollection = _this.cache[_this.state.year]

          // path with identity projection
          path = d3.geo.path()
          .projection(null);
        }

        var nodes = [],
        links = [];

        featureCollection.features.forEach((d, i) => {
          var centroid = path.centroid(d);
          if (centroid.some(isNaN)) {
            return;
          }
          centroid.x = centroid[0];
          centroid.y = centroid[1];
          centroid.feature = d;
          nodes.push(centroid);
        });

        d3.geom.voronoi().links(nodes).forEach(link => {
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
        // 2.1 : seuil de renouvellement des générations dans les pays développés
        // http://fr.wikipedia.org/wiki/Taux_de_f%C3%A9condit%C3%A9

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

          var measure = _this.getLastKnownMeasure('fertility', code, y)
          measure = parseFloat(measure.replace(',', '.'))

          return colors(measure)
        })
      }

      }
    },

    /**************
    Data methods */

    prepareData: function(){

      var filterCountries = require('../processing/filterCountries.js')
      this.topojsonData = filterCountries(topojsonData)

      if (this.props.preprocessed){
        this.cache = preprocessedData
        this.setState({processed: true})
      }
    },

    /* metric should be 'population' or 'fertility' */
    getCountryMeasure: function(metric, code, year){
      var countries = this.props[metric].column(['Country Code']).data
      var index = countries.indexOf(code)
      return this.props[metric].column([year]).data[index]
    },

    getLastKnownMeasure: function(metric, code, year){
      var _this = this
      var countries = this.props[metric].column(['Country Code']).data
      var index = countries.indexOf(code)

      function getMeasure(yyyy){
        return _this.props[metric].column([yyyy]).data[index]
      }
      var measure = getMeasure(year)
      while (measure === ".."){ //NaN : estimates can span half decades.
        year --;
        measure = getMeasure(year)
      }
      return measure
    },

    // Get an object of countryId: metric pairs for a given metric and year
    getValuesForYear: function(metric, year){
      var countries = this.props[metric].column(['Country Code']).data
      var data = this.props[metric].column([year]).data
      //zip these two collections
      var result = {}
      countries.forEach((c, i) => {
        if (c != null) result[c] = data[i]
        })
      return result
    },

    getCountryName: function(code){
      var countries = this.props['population'].column(['Country Code']).data
      var index = countries.indexOf(code)
      return this.props.population.column(['Country Name']).data[index]
    },

    /**********************
      Misc */

    getWindowDimensions: function(){
      var d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0];

      var x = window.innerWidth || e.clientWidth || g.clientWidth;
      var y = window.innerHeight|| e.clientHeight|| g.clientHeight;

      return [x, y]
    },

});

module.exports = Visualisation;

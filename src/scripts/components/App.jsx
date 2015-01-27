/**
 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');

// Export React so the devtools can find it
(window !== window.top ? window.top : window).React = React;

// CSS
require('../../styles/reset.css');
require('../../styles/main.css');
require('../../libs/font-awesome-4.2.0/css/font-awesome.min.css')

var _ = require('underscore.deferred')
//var Miso = require("../../libs/miso.dataset/miso.ds.deps.min.0.4.1.js");
var Miso = require("miso.dataset");

var spreadsheetKey = '1ervP2v1tVgEdKyGuwn7KUdy4UaVYQ3wWRKITv7V2XLQ'

//Local data for dev
var data = {
  1: require('json!../../data/population.json'),
  2: require('json!../../data/fertility.json')
}

function constructMiso(worksheetIndex){

  //Load from local jsons
  return new Miso.Dataset({
    data: data[worksheetIndex]
  })

  //Load from google spreadsheet
  return new Miso.Dataset({
    importer : Miso.Dataset.Importers.GoogleSpreadsheet,
    parser : Miso.Dataset.Parsers.GoogleSpreadsheet,
    key : spreadsheetKey,
    worksheet : worksheetIndex + ''
  });

}

var Visualisation = require('./Visualisation.jsx')

var App = React.createClass({
  getInitialState: function(){
    return {ds: null, introduced: 'yes'}
  },
  componentDidMount: function(){
    var _this = this

    /* Using Miso dataset to import data from google spreadsheets */
    var populationDs = constructMiso(1)
    var fertilityDs = constructMiso(2)

    _.when(populationDs.fetch(), fertilityDs.fetch()).then(function() {
      _this.setState({population: populationDs, fertility: fertilityDs})
    });
  },
  render: function() {

    var intro = {
      'yes': <div/>,
      '1': <div>
            <p id="i1">
              What would Europe look like,
              if country boundaries were redrawn every year according to population growth ?
            </p>
            <div id="next" onClick={this.to1}>
              I don't know !
            </div>
          </div>
          ,
      '2': <div>
            <p id="i2">
              This is 1960. Look at the size of Germany, more than twice as big as Spain.
            </p>
            <div id="next" className="white" onClick={this.introduced}>
              Check it out
            </div>
          </div>
    }

    var opacities = {'yes': 0, '1': 0.97, '2': 0.65 }

    var overlayStyle = {
        background: 'rgba(0, 0, 0, ' + opacities[this.state.introduced] + ')',
        display: this.state.introduced === 'yes' ? 'none' : 'block'
    }

    return (
      <div className='main'>
          <div
            id="overlay"
            style={overlayStyle}>

            <div id="intro">
              <div id="close">
                <i className="fa fa-times" onClick={this.introduced}></i>
              </div>
              {intro[this.state.introduced]}
            </div>
          </div>
          <Visualisation
            intro={this.state.introduced !== 'yes' ? 'introMode' : ''}
            population={this.state.population}
            fertility={this.state.fertility}
          />
      </div>
    );
  },

  to1: function(){
    this.setState({introduced: '2'})
  },
  introduced: function(){
    this.setState({introduced: 'yes'})
  }
});

React.renderComponent(<App />, document.getElementById('content')); // jshint ignore:line

module.exports = App;

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
    return {ds: null}
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
    return (
      <div className='main'>
          <Visualisation population={this.state.population} fertility={this.state.fertility}/>
      </div>
    );
  }
});

React.renderComponent(<App />, document.getElementById('content')); // jshint ignore:line

module.exports = App;

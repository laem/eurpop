/**
 * @jsx React.DOM
 */

'use strict';

var React = require('react/addons');
var ReactTransitionGroup = React.addons.TransitionGroup;

// Export React so the devtools can find it
(window !== window.top ? window.top : window).React = React;

// CSS
require('../../styles/reset.css');
require('../../styles/main.css');
var Miso = require("miso.dataset");
var _ = require("underscore.deferred");

var Visualisation = require('./Visualisation.jsx')

var imageURL = '../../images/yeoman.png';


var App = React.createClass({
  getInitialState: function(){
    return {ds: null}
  },
  componentDidMount: function(){
    var _this = this
    var spreadsheetKey = '1ervP2v1tVgEdKyGuwn7KUdy4UaVYQ3wWRKITv7V2XLQ'
    var populationDs = new Miso.Dataset({
      importer : Miso.Dataset.Importers.GoogleSpreadsheet,
      parser : Miso.Dataset.Parsers.GoogleSpreadsheet,
      key : spreadsheetKey,
      worksheet : "1"
    });

    var fertilityDs = new Miso.Dataset({
      importer : Miso.Dataset.Importers.GoogleSpreadsheet,
      parser : Miso.Dataset.Parsers.GoogleSpreadsheet,
      key : spreadsheetKey,
      worksheet : "2"
    });

    _.when(populationDs.fetch(), fertilityDs.fetch()).then(function() {
      _this.setState({population: populationDs, fertility: fertilityDs})
    });
  },
  render: function() {
    return (
      <div className='main'>
        <ReactTransitionGroup transitionName="fade">
          <Visualisation population={this.state.population} fertility={this.state.fertility}/>
        </ReactTransitionGroup>
      </div>
    );
  }
});

React.renderComponent(<App />, document.getElementById('content')); // jshint ignore:line


module.exports = ForceCartogramApp;

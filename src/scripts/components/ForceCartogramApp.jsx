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

var Map = require('./Map.jsx')

var imageURL = '../../images/yeoman.png';


var ForceCartogramApp = React.createClass({
  getInitialState: function(){
    return {ds: null}
  },
  componentDidMount: function(){
    var _this = this
    var ds = new Miso.Dataset({
      importer : Miso.Dataset.Importers.GoogleSpreadsheet,
      parser : Miso.Dataset.Parsers.GoogleSpreadsheet,
      key : "1ervP2v1tVgEdKyGuwn7KUdy4UaVYQ3wWRKITv7V2XLQ",
      worksheet : "1"
    });

    var dsProp;

    ds.fetch({
      success : function() {
        _this.setState({ds: ds})
      },
      error : function() {
        console.log("Are you sure you are connected to the internet?");
      }
    });
  },
  render: function() {
    return (
      <div className='main'>
        <ReactTransitionGroup transitionName="fade">
          <Map ds={this.state.ds}/>
        </ReactTransitionGroup>
      </div>
    );
  }
});

React.renderComponent(<ForceCartogramApp />, document.getElementById('content')); // jshint ignore:line


module.exports = ForceCartogramApp;

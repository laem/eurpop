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
var Map = require('./Map.jsx')

var imageURL = '../../images/yeoman.png';

var ForceCartogramApp = React.createClass({
  render: function() {
    return (
      <div className='main'>
        <ReactTransitionGroup transitionName="fade">
          <Map />
        </ReactTransitionGroup>
      </div>
    );
  }
});

React.renderComponent(<ForceCartogramApp />, document.getElementById('content')); // jshint ignore:line

module.exports = ForceCartogramApp;

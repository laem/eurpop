'use strict';

describe('Main', function () {
  var ForceCartogramApp, component;

  beforeEach(function () {
    var container = document.createElement('div');
    container.id = 'content';
    document.body.appendChild(container);

    ForceCartogramApp = require('../../../src/scripts/components/ForceCartogramApp.jsx');
    component = ForceCartogramApp();
  });

  it('should create a new instance of ForceCartogramApp', function () {
    expect(component).toBeDefined();
  });
});

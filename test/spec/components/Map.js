'use strict';

describe('Map', function () {
  var Map, component;

  beforeEach(function () {
    Map = require('../../../src/scripts/components/Map.jsx');
    component = Map();
  });

  it('should create a new instance of Map', function () {
    expect(component).toBeDefined();
  });
});

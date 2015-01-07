//Pre-compute every year.
//This, without web workers, will freeze the browser for 10 seconds or more...

for (var year = 1960; year < 2051; year++){
  console.log('YEAR ', year)
  cartogram = d3.cartogram()
  .projection(d3.geo.mercator()
  //.center([0, 0])
  .scale(y)
  .translate([0.43 * x, 1.35 * y])
)
.value(function(d) {
  var value = _this.getCountryMeasure('population', d.properties.iso_a3, year)
  return value
});

states = cartogram(_this.topojsonData, _this.topojsonData.objects.admin0.geometries);

_this.cache[year] = {cartogram: cartogram, states: states}
}

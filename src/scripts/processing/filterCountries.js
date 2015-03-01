module.exports = function(topojsonData){
  // Select all 28 european geometries
  var pays = ["FRA", "ESP", "GBR", "ITA", "PRT", "CHE", "IRL", "BEL", "LUX"]
  pays = pays.concat(["NLD", "DEU", "AUT", "HUN", "POL", "CZE", "DNK" ])

  // Sorry northern countries, the screen's too small for your area...
  //pays = pays.concat(["SWE", "EST", "FIN", "LTU", "LVA"])

  pays = pays.concat(["GRC", "CYP"]) // no geometry for "MLT" :-(
  pays = pays.concat(["ROU", "BGR", "HRV", "SVN", "SVK"])

  var geometries = topojsonData.objects.admin0.geometries

  topojsonData.objects.admin0.geometries =
    geometries.filter(function(geometry){return pays.indexOf(geometry.properties.iso_a3) > -1})

  return topojsonData
}

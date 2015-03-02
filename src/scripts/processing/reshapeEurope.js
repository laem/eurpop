/*
  Use cartogramaster in node to output a hashmap of cartogrammed topojsons.

*/
var fs = require('fs')
var GoogleSpreadsheet = require("google-spreadsheet");
var cartogramaster = require('../../libs/cartogram/cartogramaster.js')
var topojsonData = require('../../data/lala1.json')
var filterCountries = require('./filterCountries.js')

var from = 1960,
    to = 2050;

var GoogleSpreadsheets = require("google-spreadsheets");

GoogleSpreadsheets({
   key: "1ervP2v1tVgEdKyGuwn7KUdy4UaVYQ3wWRKITv7V2XLQ",
}, treatSpreadsheet);


/* Output :
{ year: { iso-a3: areaValue}}
*/
function treatSpreadsheet(err, spreadsheet){
     spreadsheet.worksheets[0].cells(null, function(err, cells) {
       //console.log(JSON.stringify(cells))

       var values = {}
       for (var i = 2; i < Object.keys(cells.cells).length - 1; i++){
         var row = cells.cells[i]
         var countryCode = row[2].value
         var yearsStartIndex = 5
         for (var columnIndex = yearsStartIndex; columnIndex <= to - from + yearsStartIndex; columnIndex ++){
           var  value = row[columnIndex].value,
                year = columnIndex + from - yearsStartIndex;
           values[year] = values[year] || {}
           values[year][countryCode] = +value
         }
       }

       treatValues(values)
     });
}

function treatValues(values){

  var maxX = 1920,
      maxY = 1030;

  var filteredTopojson = filterCountries(topojsonData)

  var promiseOfGeos = cartogramaster({
      topology: filteredTopojson,
      geometries: topojsonData.objects.admin0.geometries,
      projection: {
        name: 'mercator',
        translation: [0.35 * maxX, 1.95 * maxY],
        scaling: maxY * 1.5
      }
    },
    values,
    'iso_a3'
  );


  promiseOfGeos.then(function(a){
    //console.log(JSON.stringify(a["1962"]));
    filteredTopojson.arcs = a["1960"].arcs
    fs.writeFile('src/data/reshapedEuropeTopojson.json', JSON.stringify(filteredTopojson) , function (err) {
      if (err) throw err
      console.log("file saved")
    });

  }).fail(function( err ){
    console.log(err.message); // "Oops!"
  });

}

//keep only a n decimals in geojson coordinates
function simplifyGeojson(geo, n){

}

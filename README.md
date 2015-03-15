Eurpop
=================
> What if countries were resized every year according to their population ?
> Watch what Europe would look like from 1960 to 2050.

Source
--------------
**Worldbank Health Nutrition and Population  Statistics: Population estimates and projections.**
Fertility rate estimates span half decades.
[Source ](http://databank.worldbank.org/data/Eurpop/id/eb69234b)
[Spreadsheet](https://docs.google.com/spreadsheets/d/1ervP2v1tVgEdKyGuwn7KUdy4UaVYQ3wWRKITv7V2XLQ/edit?usp=sharing)

Notes
-----------------
*This is just an experiment*, not scientific work.
Country boundaries have evolved in that period of time (see [this page](./src/data/changements.md) for a broad list), the actual (2015) state is used as a reference.
This is a EU+Switzerland selection of countries. Some islands are not drawn (sorry, Corsica). Boundaries are simplified.

Tech
---------------
This visualisation uses:
- a [web-worker / node fork](./src/libs/cartogram) of [cartogram.js](http://prag.ma/code/d3-cartogram/) to reshape countries
- [D3.js](http://d3js.org/), and is inspired by [Force-Directed States of America](http://bl.ocks.org/mbostock/1073373)
- [miso dataset](http://misoproject.com/dataset/)
- react for everything except the map


Going further
---------------------
Please fork it ! Some evolution ideas :

- change the countries :
	1. Load a different topojson file in `Visualisation.jsx`
	2. Select the desired countries in `filterCountries.js`, adapt the cartogram function call options in `Visualisation.jsx`
	3. Copy the source spreadsheet and fill it with new data, change the id in `App.jsx`
	4. Set the `preprocessed` boolean to false, and later generate the geojson timeline data using `node src/scripts/processing/reshapeEurope.js` (since client-side computing is slow and a waste).
- try new indicators (e.g. employment rate):
	- step 3) above
	- adapt the page's text
	- (harder) let the user visualise any indicator retrieved through an API

To run it locally, simply run
```
npm install
grunt serve
```
and visit localhost:8000.

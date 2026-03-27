// Javascript written by Nolan Hegge, 3/26/2026
// Original Code Source: GEOG 575 - Activity 9

//start the code once the window loads
window.onload = setMap();

//set up a choropleth map
function setMap() {

    //dimensions for map frame
    var width = 960,
        height = 500;

    //create a new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //use Albers equal-area conic projection centered on the USA (not just midwest like code example so parameters are adjusted)
    var projection = d3.geoAlbers()
        .center([0, 38.5])
        .rotate([98, 0])
        .parallels([29.5, 45.5])
        .scale(1000)
        .translate([width / 2, height / 2]);

    //create a path generator
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize the asynchronous data loading
    var promises = [
        d3.csv("data/LivingExpensesUnitedStatesMultivariateData.csv"),
        d3.json("data/unitedStatesTopo.topojson")
    ];
    Promise.all(promises).then(callback);

	//define the callback function to ensure map is properly drawn
    function callback(data) {
        var csvData = data[0],
            usData = data[1];

        console.log(csvData);
        console.log(usData);

        //convert TopoJSON to GeoJSON
        var usStates = topojson.feature(usData, usData.objects.unitedStatesTopo).features;

        console.log(usStates);

        //add states to map (enumeration units)
        var states = map
            .selectAll(".states")
            .data(usStates)
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "states " + d.properties.postal;
            })
            .attr("d", path);
    };
};
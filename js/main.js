// Javascript written by Nolan Hegge, 4/9/2026
// Original Code Source: GEOG 575 - Activity 10, 9, and 8

(function(){

    //create pseudo-global variables
    var attrArray = ["Median_Income", "Rent_one_bed", "Unemployment_Rate_Percent", "Average_Age", "Population"];
	var expressed = {
		x:attrArray[1],        // "Rent_one_bed" on the x-axis
		y:attrArray[2],        // "Unemployment_Rate_Percent" on the y-axis
		color:attrArray[1]     // "Rent_one_bed" for color/size, idea is to show it getting darker/bigger as rent increases)
	};

    //start the code once the window is loaded
    window.onload = setMap();

    //set up a choropleth map
    function setMap() {

        //set the dimensions for the map frame
        var width = window.innerWidth * 0.5 - 25,
            height = 460;

        //create a new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //use Albers equal-area conic projection centered on the USA to fit the datea
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

        //define the callback function
        function callback(data) {
            var csvData = data[0],
                usData = data[1];

            //convert TopoJSON to GeoJSON
            var usStates = topojson.feature(usData, usData.objects.unitedStatesTopo).features;

            //join csv data to GeoJSON enumeration units
            usStates = joinData(usStates, csvData);

            //create color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(usStates, map, path, colorScale);

            //add coordinated bubble chart
            setChart(csvData, colorScale);
        };
    }; //end of the setMap() function

    //function to join together the CSV data to GeoJSON features
    function joinData(usStates, csvData) {
		//go through each row of the csv
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i];
            var csvKey = csvState.State_Full;
			//go through each GeoJSON feature to find matching state
            for (var a = 0; a < usStates.length; a++) {
                var geojsonProps = usStates[a].properties;
                var geojsonKey = geojsonProps.name;
				//when primary eys match the csv attdibutes to should be transfered to the geojson properies
                if (geojsonKey == csvKey) {
					//go through each atribute and assign the value to the GeoJSON feature.
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvState[attr]);
                        geojsonProps[attr] = val;
                    });
                }
            }
        }
		//return updated GeoJSON features array
        return usStates;
    };

    //function to create quantile color scale (color credit: https://coolors.co/palette/dad7cd-a3b18a-588157-3a5a40-344e41)
    function makeColorScale(data) {
        var colorClasses = [
            "#dad7cd",
            "#a3b18a",
            "#588157",
            "#3a5a40",
            "#344e41"
        ];

        //create the quantile scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build an array of all the expressed.color attribute values
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed.color]);
            domainArray.push(val);
        };

        colorScale.domain(domainArray);
        return colorScale;
    };

    //function to add enumeration units to the map
    function setEnumerationUnits(usStates, map, path, colorScale) {
        var states = map
            .selectAll(".states")
            .data(usStates)
            .enter()
            .append("path")
            .attr("class", function(d) {
				//get the state abbrivations
                return "states " + d.properties.postal;
            })
            .attr("d", path)
            .style("fill", function(d) {
                var value = d.properties[expressed.color];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
    };

    //function to calculate min and max values for an attribute
    function getDataValues(csvData, expressedValue) {
        var max = d3.max(csvData, function(d) { return parseFloat(d[expressedValue]); });
        var min = d3.min(csvData, function(d) { return parseFloat(d[expressedValue]); });
        var range = max - min,
            adjustment = (range / csvData.length);
        return [min - adjustment, max + adjustment];
    };

    //function to create y scale
    function createYScale(csvData, chartHeight) {
        var dataMinMax = getDataValues(csvData, expressed.y);
        return d3.scaleLinear().range([0, chartHeight]).domain([dataMinMax[1], dataMinMax[0]]);
    };

    //function to create x scale
    function createXScale(csvData, chartWidth) {
        var dataMinMax = getDataValues(csvData, expressed.x);
        return d3.scaleLinear().range([0, chartWidth]).domain([dataMinMax[0], dataMinMax[1]]);
    };

    //function to create chart axes
    function createChartAxes(chart, chartHeight, yScale, xScale) {
        var yAxisScale = d3.axisRight().scale(yScale);
        var xAxisScale = d3.axisTop().scale(xScale);

        var yaxis = chart.append("g")
            .attr("class", "yaxis")
            .call(yAxisScale);

        var xaxis = chart.append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(0," + chartHeight + ")")
            .call(xAxisScale);
    };

    //function to create coordinated bubble chart
    function setChart(csvData, colorScale) {
        var chartWidth = window.innerWidth * 0.5 - 25,
            chartHeight = 460;

        //create svg container for chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create scales
        var yScale = createYScale(csvData, chartHeight);
        var xScale = createXScale(csvData, chartWidth);

        //draw proportional circles circles
        var circles = chart.selectAll(".circles")
            .data(csvData)
            .enter()
            .append("circle")
            .attr("class", function(d) {
                return "bubble " + d.State_abv;
            })
            .attr("cx", function(d) {
                return xScale(parseFloat(d[expressed.x]));
            })
            .attr("cy", function(d) {
                return yScale(parseFloat(d[expressed.y]));
            })
            .attr("r", function(d) {
                var minRadius = 0.4;
                var radius = Math.pow(parseFloat(d[expressed.color]), 0.5715) * minRadius;
                return radius;
            })
            .attr("fill", function(d) {
                return colorScale(parseFloat(d[expressed.color]));
            })
            .style("stroke", "#fff")
            .style("stroke-width", "0.5px");

        //add axes
        createChartAxes(chart, chartHeight, yScale, xScale);
    };
})();
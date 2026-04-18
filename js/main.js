// Javascript written by Nolan Hegge, 4/16/2026
// Original Code Source: UW Cartography Lab

(function(){
    //set up the pseudo-global variables
    var attrArray = ["Median_Income", "Rent_one_bed", "Unemployment_Rate_Percent", "Average_Age", "Pop_Density_per_sqmi"];
    var attrLabels = {
        "Median_Income": "Median Household Income ($)",
        "Rent_one_bed": "Avg. 1-Bedroom Rent ($)",
        "Unemployment_Rate_Percent": "Unemployment Rate (%)",
        "Average_Age": "Average Age (years)",
        "Pop_Density_per_sqmi": "Population Density (per sq mi)"
    };

    //expressed object holds the three visual variables
    var expressed = {
        color: attrArray[0]    // Median_Income (defualt) for choropleth color and bar height
    };

    //list of greater midwest / great lakes region states for filtering out the csv
    var midwestStateNames = [
        "Illinois","Indiana","Iowa","Kansas","Michigan","Minnesota",
        "Missouri","Nebraska","North Dakota","Ohio","South Dakota",
        "Wisconsin","Kentucky","Tennessee","West Virginia","Pennsylvania"
    ];

    //start the code once the window is loaded
    window.onload = setMap();

    //set up the choropleth map
    function setMap() {

        //set the dimensions for the map frame
        var width = window.innerWidth * 0.5 - 25,
            height = 460;

        //create a new svg container for the map
        var map = d3.select("#map-container")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //use Albers equal-area conic projection and center it on the Midwest region
        var projection = d3.geoAlbers()
            .center([0, 40.5])
            .rotate([88, 0])
            .parallels([29.5, 45.5])
            .scale(1200)
            .translate([width / 2, height / 2]);

        //create a path generator
        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize the asynchronous data loading
        var promises = [
            d3.csv("data/LivingExpensesUnitedStatesMultivariateData.csv"),
            d3.json("data/midwestStates.topojson"),
            d3.json("data/unitedStatesTopo.topojson")
        ];
        Promise.all(promises).then(callback);

        //define the callback function in order to handle the loaded data
        function callback(data) {
            var csvData = data[0],
                midwestData = data[1],
                usData = data[2];

            //filter the csv to only midwest-ish states
            var midwestCsv = csvData.filter(function(d) {
                return midwestStateNames.indexOf(d.State_Full) > -1;
            });

            //convert full US TopoJSON to GeoJSON for background layer
            var usStates = topojson.feature(usData, usData.objects.unitedStatesTopo);

            //convert midwest TopoJSON to GeoJSON for the enumeration units
            var midwestFeatures = topojson.feature(midwestData, midwestData.objects.midwestStates).features;

            //join csv data to midwest GeoJSON features
            midwestFeatures = joinData(midwestFeatures, midwestCsv);

            //create the color scale
            var colorScale = makeColorScale(midwestCsv);

            //add the full US background to the map
            map.append("path")
                .datum(usStates)
                .attr("class", "us-background")
                .attr("d", path);

            //add midwest enumeration units to the map
            setEnumerationUnits(midwestFeatures, map, path, colorScale);

            //add the reexpress dropdown
            setDropdown(midwestFeatures, midwestCsv, map, path);

            //add the coordinated bar chart
            setChart(midwestCsv, colorScale);
        };
    }; //end of setMap()

    //function to join CSV data to GeoJSON features
    function joinData(midwestFeatures, csvData) {
        //loop through each row of the CSV
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i];
            var csvKey = csvState.State_Full; //CSV primary key

            //loop through each GeoJSON feature to find the matching state
            for (var a = 0; a < midwestFeatures.length; a++) {
                var geojsonProps = midwestFeatures[a].properties;
                var geojsonKey = geojsonProps.name; //GeoJSON primary key

                //when primary keys match, transfer CSV attributes to GeoJSON properties
                if (geojsonKey == csvKey) {
                    //loop through each attribute and assign its value to the GeoJSON feature
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvState[attr]);
                        geojsonProps[attr] = val;
                    });
                }
            }
        }
        //return the updated GeoJSON features array
        return midwestFeatures;
    };

    //function to create a quantile color scale
    function makeColorScale(data) {
        //green color scheme from coolors.co https://coolors.co/palette/dad7cd-a3b18a-588157-3a5a40-344e41
        var colorClasses = [
            "#c4c1bb",  // darkened from original color scheme so it would pop more against the background color of the map ( #dad7cd)
            "#a3b18a",
            "#588157",
            "#3a5a40",
            "#344e41"
        ];

        //create the quantile scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build an array of all expressed.color attribute values for the domain
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed.color]);
            domainArray.push(val);
        };

        colorScale.domain(domainArray);
        return colorScale;
    };

    //function to add enumeration units to the map
    function setEnumerationUnits(midwestFeatures, map, path, colorScale) {
        //remove any existing state paths before redrawing
        map.selectAll(".midwest-state").remove();

        //draw a path for each midwest state
        map.selectAll(".midwest-state")
            .data(midwestFeatures)
            .enter()
            .append("path")
            .attr("class", function(d) {
                //assign class using the state postal abbreviation
                return "midwest-state " + d.properties.postal;
            })
            .attr("d", path)
            .style("fill", function(d) {
                //color each state based on the expressed color attribute
                var value = d.properties[expressed.color];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc"; //gray out for any missing data
                }
            })
            //retrieve: highlight the state when mouse hovers over it
            .on("mouseover", function(event, d) {
                highlight(d.properties);
            })
            //retrieve: remove highlight on state when mouse goes off of it
            .on("mouseout", function(event, d) {
                dehighlight(d.properties);
            })
            //retrieve: move the label with the mouse
            .on("mousemove", function(event, d) {
                moveLabel(event, d.properties);
            });
    };

    //function to add the reexpress dropdown menu
    function setDropdown(midwestFeatures, midwestCsv, map, path) {
        //add label before the dropdown
        d3.select("#controls")
            .append("label")
            .attr("class", "dropdown-label")
            .text("Map Attribute: ");

        //create a dropdown select element
        var dropdown = d3.select("#controls")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function() {
                //update the expressed color attribute when dropdown changes
                expressed.color = this.value;

                //rebuild color scale with new attribute
                var colorScale = makeColorScale(midwestCsv);

                //update map colors
                setEnumerationUnits(midwestFeatures, map, path, colorScale);

                //update bar chart
                updateChart(midwestCsv, colorScale);
            });

        //add an option for each attribute in the array
        dropdown.selectAll("option")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d) { return d; })
            .text(function(d) { return attrLabels[d]; });
    };

    //function to create the initial coordinated bar chart
    function setChart(csvData, colorScale) {
        var chartWidth = window.innerWidth * 0.5 - 25,
            chartHeight = 460,
            leftPadding = 50,
            rightPadding = 15,
            topBottomPadding = 30,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2;

        //create svg container for the chart
        var chart = d3.select("#chart-container")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //add a background rect for the chart area
        chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", "translate(" + leftPadding + "," + topBottomPadding + ")");

        //sort data smallest to largest by the expressed attribute
        var sortedData = csvData.slice().sort(function(a, b) {
            return parseFloat(a[expressed.color]) - parseFloat(b[expressed.color]);
        });

        //create y scale based on the expressed attribute range
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function(d) {
                return parseFloat(d[expressed.color]) * 1.1;
            })]);

        //create x scale using sorted state abbreviations
        var xScale = d3.scaleBand()
            .range([0, chartInnerWidth])
            .domain(sortedData.map(function(d) { return d.State_abv; }))
            .padding(0.1);

        //draw a bar for each state, using State_abv as the key
        chart.selectAll(".bar")
            .data(sortedData, function(d) { return d.State_abv; })
            .enter()
            .append("rect")
            .attr("class", function(d) {
                return "bar " + d.State_abv;
            })
            .attr("width", xScale.bandwidth())
            .attr("x", function(d) {
                return xScale(d.State_abv) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed.color]));
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed.color])) + topBottomPadding;
            })
            .style("fill", function(d) {
                return colorScale(parseFloat(d[expressed.color]));
            })
            //retrieve: highlights the bar when mouse hovers over
            .on("mouseover", function(event, d) {
                highlight(d);
            })
            //retrieve: removes the highlight on the bar when the mouse hovers off
            .on("mouseout", function(event, d) {
                dehighlight(d);
            })
            //retrieve: move the labels with the mouse
            .on("mousemove", function(event, d) {
                moveLabel(event, d);
            });

        //add the y axis
        var yAxis = d3.axisLeft(yScale);
        chart.append("g")
            .attr("class", "yaxis")
            .attr("transform", "translate(" + leftPadding + "," + topBottomPadding + ")")
            .call(yAxis);

        //add the x axis
        var xAxis = d3.axisBottom(xScale);
        chart.append("g")
            .attr("class", "xaxis")
            .attr("transform", "translate(" + leftPadding + "," + (chartInnerHeight + topBottomPadding) + ")")
            .call(xAxis);

        //add the y axis label
        chart.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 12)
            .attr("x", -(chartHeight / 2))
            .style("text-anchor", "middle")
            .attr("id", "yAxisLabel")
            .text(attrLabels[expressed.color]);

        //add the chart title
        chart.append("text")
            .attr("class", "chart-title")
            .attr("x", chartWidth / 2)
            .attr("y", topBottomPadding - 8)
            .style("text-anchor", "middle")
            .attr("id", "chartTitle")
            .text(attrLabels[expressed.color] + " by State");
    };

    //function to update bar chart when reexpressing
    function updateChart(csvData, colorScale) {
        var chartWidth = window.innerWidth * 0.5 - 25,
            chartHeight = 460,
            leftPadding = 50,
            rightPadding = 15,
            topBottomPadding = 30,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2;

        //re-sort the data by new expressed attribute smallest to largest
        var sortedData = csvData.slice().sort(function(a, b) {
            return parseFloat(a[expressed.color]) - parseFloat(b[expressed.color]);
        });

        //update y scale baesed on the new attribute
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function(d) {
                return parseFloat(d[expressed.color]) * 1.1;
            })]);

        //update x scale domain with the new sort order
        var xScale = d3.scaleBand()
            .range([0, chartInnerWidth])
            .domain(sortedData.map(function(d) { return d.State_abv; }))
            .padding(0.1);

        //update bar positions, heights, and colors again using State_abv as the key
        d3.selectAll(".bar")
            .data(sortedData, function(d) { return d.State_abv; })
            .transition()
            .duration(500)
            .attr("x", function(d) {
                return xScale(d.State_abv) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed.color]));
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed.color])) + topBottomPadding;
            })
            .style("fill", function(d) {
                return colorScale(parseFloat(d[expressed.color]));
            });

        //update the y axis with new scale
        var yAxis = d3.axisLeft(yScale);
        d3.select(".yaxis")
            .transition()
            .duration(500) //fancy animation timing!
            .call(yAxis);

        //update the x axis with new sort order
        var xAxis = d3.axisBottom(xScale);
        d3.select(".xaxis")
            .transition()
            .duration(500)
            .call(xAxis);

        //update the y axis label
        d3.select("#yAxisLabel")
            .text(attrLabels[expressed.color]);

        //update the chart title
        d3.select("#chartTitle")
            .text(attrLabels[expressed.color] + " by State");
    };

    //function to highlight a state on BOTH the map and chart
    function highlight(props) {
        var abbv = props.postal || props.State_abv;
    
        //move hovered state to end of DOM so it renders on top (prevents border getting stuck behind other map elements)
        d3.selectAll(".midwest-state." + abbv).raise();
    
        //bold the border on the map state
        d3.selectAll(".midwest-state." + abbv)
            .style("stroke", "#000")
            .style("stroke-width", "2.5px");
    
        //bold the border on the bar
        d3.selectAll(".bar." + abbv)
            .style("stroke", "#000")
            .style("stroke-width", "2px");
    
        //show the dynamic info label
        setLabel(props);
    };

    //function to remove the highlight from map and chart
    function dehighlight(props) {
        var abbv = props.postal || props.State_abv;

        //restore the original map state stroke
        d3.selectAll(".midwest-state." + abbv)
            .style("stroke", "#fff")
            .style("stroke-width", "1px");

        //restore original bar stroke 
        d3.selectAll(".bar." + abbv)
            .style("stroke", "none");

        //remove the dynamic label
        d3.select(".infolabel").remove();
    };

    //function to create the dynamic info label
    function setLabel(props) {
        //remove any existing label first
        d3.select(".infolabel").remove();

        //get the state name and abbreviation from either GeoJSON props or CSV row
        var stateName = props.name || props.State_Full;
        var abbv = props.postal || props.State_abv;
        var value = props[expressed.color];

        //format the value nice and pretty
        var formattedValue = value ? parseFloat(value).toLocaleString() : "N/A";

        //build the label HTML
        var labelContent = "<b>" + stateName + " (" + abbv + ")</b><br/>" +
            attrLabels[expressed.color] + ": " + formattedValue;

        //create the floating label div
        d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .html(labelContent);
    };

    //function to move the label dynamically to follow the mouse
    function moveLabel(event, props) {
        var label = d3.select(".infolabel");

        //offset the label from mouse cursor
        var x = event.clientX + 15;
        var y = event.clientY - 75;

        //keep label within the window bounds
        if (x + 180 > window.innerWidth) x = event.clientX - 195;
        if (y < 0) y = event.clientY + 15;

        label
            .style("left", x + "px")
            .style("top", y + "px");
    };

})();
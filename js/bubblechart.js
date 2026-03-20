// Javascript written by Nolan Hegge, 1/23/2026
// Original Code Source: GEOG 575 - Activity 3
// Credit to Chapter 8 for boiler plate code

// THIS IS A COPY OF MAIN.JS FROM ACTIVITY 8 AS MAIN.JS WILL CHANGE WITH THE FOLLOWING ACTIVITIES

window.onload = function () {

    //set the SVG dimensions
    var w = 900, h = 500;

    //city population data from chapter 2
    var cityPop = [
        { city: 'Madison',   population: 233209 },
        { city: 'Milwaukee', population: 594833 },
        { city: 'Green Bay', population: 104057 },
        { city: 'Superior',  population: 27244  }
    ];

    // set the min and max population for the sscales
    var minPop = d3.min(cityPop, function(d) { return d.population; });
    var maxPop = d3.max(cityPop, function(d) { return d.population; });

    // generate the scales
    var x = d3.scaleLinear() //make scale  for x
        .range([90, 700])    //output min and max - modified to make content fit comfortably
        .domain([0, 3]);     //input min and max

    var y = d3.scaleLinear() //make scale  for y
        .range([450, 50]) //output min and max - modified to make content fit comfortably
        .domain([0, 700000]); //input min and max

    //make a color scale for the cicles
    var color = d3.scaleLinear()
        .range(["#FDBE85", "#D94701"])
        .domain([minPop, maxPop]);

    //create a format generator
    var format = d3.format(",");

    //make a variable for the SVG container block
    var container = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "container")
        .style("background-color", "rgba(0,0,0,0.2)");

    //block for the inner rectangle
    var innerRect = container.append("rect")
        .datum(400)
        .attr("width", 800)
        .attr("height", 400)
        .attr("class", "innerRect")
        .attr("x", 50)
        .attr("y", 50)
        .style("fill", "#FFFFFF");

    //block for the circles
    var circles = container.selectAll(".circles")
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d) { return d.city; })
        .attr("r", function(d) {
            var area = d.population * 0.01;
            return Math.sqrt(area / Math.PI);
        })
        .attr("cx", function(d, i) {
            return x(i);
        })
        .attr("cy", function(d) {
            return y(d.population);
        })
        .style("fill", function(d) {
            return color(d.population);
        })
        .style("stroke", "#000");

    //generate the y axis
    var yAxis = d3.axisLeft(y);

    //block for the axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    //block for the title
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    //block folr the labels
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d) {
			//added -8 to ensure that the labels are centered
            return y(d.population) - 8;
        });

    //first line of the label (cityu name)
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d, i) {
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d) { return d.city; });

    //first line of the label (population)
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d, i) {
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15")
        .text(function(d) {
            return "Pop. " + format(d.population);
        });

};
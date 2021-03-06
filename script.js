// code based on various internet sources, including:
// https://flowingdata.com/2016/08/23/make-a-moving-bubbles-chart-to-show-clustering-and-distributions/
// https://bl.ocks.org/pbogden/854425acb57b4e5a4fdf4242c068a127
// http://d3indepth.com/force-layout/

// Global vars
var margin = { top: 30, right: 10, bottom: 10, left: 30 },
    width = 1625,
    height = 700;

var radius = 2.5;
var center = {
    x: width /2, 
    y: (height /2) - (height/25)
};

var destinationClusterRingRadius = 200;
var classificationOffset = 100;
var resultoffset = 10;

// Create svg
var svg = d3.select("body").append("svg")
    .attr("width", width) 
    .attr("height", height) 
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .append("g");

// Colors for each result category
var results = {
    "recognized": { x: 0, y: 0, color: "#008744" },
    "rejected": { x: 0, y: 0, color: "#d62d20" },
    "other": { x: 0, y: 0, color: "#ffa700" }
};

// Create rings around the center for each country destination
var destinationClusters = {
    "Netherlands": { theta: - 150 - 40, color: "#005b96", recogtheta: - 150 - 40 - resultoffset, rejecttheta: - 150 - 40, othertheta: - 150 - 40 + resultoffset },
    "Sweden": { theta: - 150, color: "#005b96", recogtheta: - 150 - resultoffset, rejecttheta: - 150, othertheta: - 150 + resultoffset },
    "Germany": { theta: -150 + 40, color: "#005b96", recogtheta: - 150 + 40 - resultoffset, rejecttheta: - 150 + 40, othertheta: - 150 + 40 + resultoffset },
    "Lebanon": { theta: - 30 - 35, color: "#005b96", recogtheta: - 30 - 35 - resultoffset, rejecttheta: - 30 - 35, othertheta: - 30 - 35 + resultoffset },
    "Jordan": { theta: - 30, color: "#005b96", recogtheta: - 30 - resultoffset, rejecttheta: - 30, othertheta: - 30 + resultoffset },
    "Turkey": { theta: - 30 + 40, color: "#005b96", recogtheta: - 30 + 40 - resultoffset, rejecttheta: - 30 + 40, othertheta: - 30 + 40 + resultoffset },
    "US": { theta: 90 + 40, color: "#005b96", recogtheta: 90 + 40 - resultoffset, rejecttheta: 90 + 40, othertheta: 90 + 40 + resultoffset },
    "Canada": { theta: 90 - 35, color: "#005b96", recogtheta: 90 - 35 - resultoffset, rejecttheta: 90 - 35, othertheta: 90 - 35 + resultoffset },
    "World - Elsewhere": { theta: 90, color: "#005b96", recogtheta: 90 - resultoffset, rejecttheta: 90, othertheta: 90 + resultoffset }
};

// Create labels
var explainTextLeftX = 125;
var explainTextLeftY = 70;
var explainTextRightX = 550;
var explainTextRightY = 70;
var seekerText = createText("", center.x, center.y - 15, 'middle', 20);
var explanationTextLeft = createText("", explainTextLeftX, explainTextLeftY, 'start', 14);
var explanationTextRight = createText("", explainTextRightX, explainTextRightY, 'start', 14);
var year = createText("", explainTextRightX +565, explainTextRightY +70, 'start', 12)
var totaltext = createText("", explainTextRightX +565, explainTextRightY +85, 'start', 12);
var recogtext = createText("", explainTextRightX +565, explainTextRightY +100, 'start', 12);
var rejecttext = createText("", explainTextRightX +565, explainTextRightY +115, 'start', 12);
var othertext = createText("", explainTextRightX +565, explainTextRightY +130, 'start', 12);
var pendingtext = createText("", explainTextRightX +565, explainTextRightY +145, 'start', 12);


var circleLegendRecog = svg.append("circle")
                .attr("r", radius+2)
                .style("fill", "#005b96")
                .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 70) + ")")
                .append("g");
createText('= Pending', width/2 + 150 + 7, height -36, 'start', 12);

var circleLegendRecog = svg.append("circle")
                .attr("r", radius+2)
                .style("fill", results.recognized.color)
                .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 55) + ")")
                .append("g");
createText('= Recognized', width/2 + 150 + 7, height - 21, 'start', 12);

var circleLegendReject = svg.append("circle")
            .attr("r", radius+2)
            .style("fill", results.rejected.color)
            .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 40) + ")")
            .append("g");
createText('= Rejected', width/2 + 150 + 7, height - 7, 'start', 12);

var circleLegendOther = svg.append("circle")
            .attr("r", radius+2)
            .style("fill", results.other.color)
            .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 25) + ")")
            .append("g");
createText('= Other Outcome', width/2 + 150 + 7, height + 9, 'start', 12);

// Build destinationClusters
Object.keys(destinationClusters).forEach(function (key) {
    var cluster = destinationClusters[key];
    cluster.x = convertCoordX(destinationClusterRingRadius, cluster.theta);
    cluster.y = convertCoordY(destinationClusterRingRadius, cluster.theta);
    createText(key, cluster.x, cluster.y - 15, 'middle', 18);
});
// console.log(destinationClusters)

// Classify where each node is to go
function classify(id, destinationClusters) {
    var recognized = destinationClusters.recognized;
    var rejected = destinationClusters.rejected;
    var other = destinationClusters.other;

    if (id < recognized) {
        return 'recognized';
    } else if (id < recognized + rejected) {
        return 'rejected';
    } else if (id < recognized + rejected + other) {
        return 'other';
    } else {
        return 'pending';
    }
}

// Vars to build
var nodes = [];
var centerSeekers = [];
var pendings = [];
var numberTracker = { };
var numberYear = { };
var simulation;
var circle;
var allFilenames = ['irq_13_js.json', 'irq_14_js.json', 'irq_15_js.json', 'irq_16_js.json'];
var filenames = allFilenames.slice();
var findYear = {72: 13, 224: 14, 550: 15, 981: 16};

// Text explanations
var explanations = {'irq_13_js.json':'In the decade following the 2003 Iraq War, the number of Iraqi asylum seekers ranged between 50 ~ 80 thousand per year.', 
    'irq_14_js.json':"Conflict began in early 2014 and escalated into a civil war with the ISIS conquest of Mosul, Iraq's second largest city, in June.",
    'irq_15_js.json':'With millions internally displaced, asylum applications doubled for the second year in a row. Many remain for years in pending status.',
    'irq_16_js.json':'The majority of asylum seekers stay within the region, while a significant proportion aim to go to Europe. A small fraction head to the US.'
}

// FUNCTIONS
// Reset everything
function reset() {
    filenames = allFilenames.slice();
    if (circle) {
        circle.remove();
    }
    if (simulation) {
        simulation.stop();
    }
    nodes = [];
    centerSeekers = [];
    pendings = [];
    numberTracker = {};
    numberYear = {};
    numpending = 0;
    seekerText.text("");
    explanationTextLeft.text("");
    explanationTextRight.text("");
    year.text("");
    recogtext.text("");
    rejecttext.text("");
    othertext.text("");
    pendingtext.text("");
    totaltext.text("");
}

// Master function (one year at a time)
function nextYear() {
    addData(filenames.shift());
}

function addData(filename) {
    // if (simulation) simulation.stop();
    // Load file
    d3.json(filename, function (error, data) {
    var dataset;
    if (error) {
        console.log(error);
        } else {
            dataset = data;
            //console.log(data);
        }
        // Add text
        seekerText.text('Asylum Seekers in 20' + filename.substring(4,6));
        explanationTextLeft.text(explanations[filename]).call(wrapText,300, explainTextLeftX);

        // Create nodes based on the dataset
        dataset.forEach(function (d) {
            var destinationCluster = destinationClusters[d.Destination];

            // Calculate number of nodes for each classification of the cluster.
            destinationCluster.total = Math.round(d.Total_apps / 1000);
            destinationCluster.recognized = Math.round(d.Recognized / 1000);
            destinationCluster.rejected = Math.round(d.Rejected / 1000);
            destinationCluster.other = Math.round(d.Other / 1000);

            // Build numberTracker for hover 
            var pendingCount = d.Total_apps - d.Recognized - d.Rejected - d.Other;
            numberTracker[d.Destination] = numberTracker[d.Destination] || {};
            numberTracker[d.Destination]['recognized'] = (numberTracker[d.Destination]['recognized'] || 0) + d.Recognized;
            numberTracker[d.Destination]['rejected'] = (numberTracker[d.Destination]['rejected'] || 0) + d.Rejected;
            numberTracker[d.Destination]['other'] = (numberTracker[d.Destination]['other'] || 0) + d.Other;
            numberTracker[d.Destination]['pending'] = (numberTracker[d.Destination]['pending'] || 0) + pendingCount;
            // console.log(numberTracker)

            // Build numberYear for text
            numberYear[filename.substring(4,6)] = numberYear[filename.substring(4,6)] || {};
            numberYear[filename.substring(4,6)]['recognized'] = (numberYear[filename.substring(4,6)]['recognized'] || 0) + d.Recognized;
            numberYear[filename.substring(4,6)]['rejected'] = (numberYear[filename.substring(4,6)]['rejected'] || 0) + d.Rejected;
            numberYear[filename.substring(4,6)]['other'] = (numberYear[filename.substring(4,6)]['other'] || 0) + d.Other;
            numberYear[filename.substring(4,6)]['pending'] = (numberYear[filename.substring(4,6)]['pending'] || 0) + pendingCount;
            //console.log(numberYear)

            // Create nodes for this destination
            d3.range(destinationCluster.total).map(function (id) {
                var node = {
                    id: d.Destination + id,
                    // Randomize distribution around the center 
                    x: center.x,
                    y: center.y,
                    radius: radius,
                    destinationCluster: destinationCluster,
                    destination: d.Destination,
                    // Classify the nodes in this destination
                    classification: classify(id, destinationCluster),
                    color: "#283747",
                    text: ""
                };
                centerSeekers.push(node);
            });   
        }); 

        // So that the nodes move randomly  
        centerSeekers = shuffle(centerSeekers);
        nodes = nodes.concat(centerSeekers);
        //console.log(centerSeekers)
        //console.log(nodes)

        // Remove old nodes so there is no overlap
        if (circle) {
            circle.remove();
        }

        // Add the nodes
        circle = svg.selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", function (d) {
                return d.radius;
            })
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            })
            .style("fill", function (d) {
                return d.color;
            })
            // For hover function
            .on("mouseover", function(d) {
                if (d.text == 'usenumbertracker') {
                    var text = numberTracker[d.destination][d.classification];
                } else {
                    var text = d.text;
                }
                tooltip.text(text);
                return tooltip.style("visibility", "visible");
            })
            .on("mousemove", function(d) {
                return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
            })
            .on("mouseout", function(d) { 
                return tooltip.style("visibility", "hidden");}
            );

        // Force-directed layout
        simulation = d3.forceSimulation(nodes)
            .force("collide", forceCollide)
            .force("cluster", forceCluster)
            .on("tick", tick)
            .alpha(0.015);

        setTimeout(goToDestination, 1000);
    });
} //addData ends here

// Prevent collisions between nodes
var forceCollide = d3.forceCollide()
    .radius(function (d) {
        return d.radius + 1;
    });

// Change the x, y velocity for each node
function forceCluster(alpha) {
    for (var i = 0; i < nodes.length; ++i) {
        var node = nodes[i];
        var target = node.target || center;
        node.vx -= (node.x - target.x) * alpha;
        node.vy -= (node.y - target.y) * alpha;
    }
}

// Update frame of animation: redraw in the new position in new color with each tick
function tick() {
    if (!circle) return;
    circle
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .style("fill", function (d) {
            return d.color;
        });
    }

var updateInterval = 20;

// Go to destination country
function goToDestination() {
    if (centerSeekers.length > 0) {
        var node = centerSeekers.pop();
        node.color = node.destinationCluster.color;
        node.target = node.destinationCluster;
        pendings.push(node); 

        simulation.alpha(0.015);  // Keep the alpha constant instead of slowing down
        setTimeout(goToDestination, updateInterval);
    } else {
        var keepAlive = setInterval(function () { 
            simulation.alpha(0.015);
        }, updateInterval); // do this function every x milliseconds

        setTimeout(function () {
            clearInterval(keepAlive); // stop setinterval (keeping alive)
            classifyPendings(); // then start classifying
        }, 2000); // give last nodes time to travel
    }
}

// Next level of classification into results groups
var numpending = 0;
function classifyPendings() {
    if (pendings.length > 0) {
        var node = pendings.pop();
        var classification = results[node.classification];
        numpending = numpending + 1;
        node.text = 'usenumbertracker'; 
        if (classification) {
            node.color = results[node.classification].color;

            // Clone the current target
            node.target = { x: node.target.x, y: node.target.y };

            // Assign new locations relative to the current destination's center depending on the classification.
            if (node.classification === 'recognized') {
                node.target = {x: convertCoordX(destinationClusterRingRadius + classificationOffset, node.destinationCluster.recogtheta),
                            y: convertCoordY(destinationClusterRingRadius + classificationOffset, node.destinationCluster.recogtheta)}
            } else if (node.classification === 'rejected') {
                node.target = {x: convertCoordX(destinationClusterRingRadius + classificationOffset, node.destinationCluster.rejecttheta),
                            y: convertCoordY(destinationClusterRingRadius + classificationOffset, node.destinationCluster.rejecttheta)}
            } else {
                node.target = {x: convertCoordX(destinationClusterRingRadius + classificationOffset, node.destinationCluster.othertheta),
                            y: convertCoordY(destinationClusterRingRadius + classificationOffset, node.destinationCluster.othertheta)}
            }
        }

        simulation.alpha(0.015);  // Keep the alpha constant instead of slowing down
        setTimeout(classifyPendings, updateInterval);  
    } else {
        var keepAlive = setInterval(function () {
            simulation.alpha(0.015);
        }, updateInterval);

        // Keep the nodes moving for another 5 seconds
        setTimeout(function () {
            clearInterval(keepAlive);
        }, 5000);
        // Add text explanation
        explanationTextRight.text('Each dot represents approximately 1000 people. Hover over the dots to see exact cumulative figure.')
        .call(wrapText,300, explainTextRightX);
        year.text("TOTALS IN 20" + findYear[numpending])
        recogtext.text("Recognized: " + format(numberYear[findYear[numpending]]['recognized']));
        rejecttext.text("Rejected: " + format(numberYear[findYear[numpending]]['rejected']));
        othertext.text("Other Outcome: " + format(numberYear[findYear[numpending]]['other']));
        pendingtext.text("Pending: " + format(numberYear[findYear[numpending]]['pending']));
        totaltext.text("Applications: " + format(numberYear[findYear[numpending]]['recognized'] + numberYear[findYear[numpending]]['rejected'] + numberYear[findYear[numpending]]['other'] + numberYear[findYear[numpending]]['pending']));
    }
} 

// Number formatting
format = d3.format(",");

// Convert angles -> radians -> coordinates 
function convertCoordX(ringradius, theta) {
    return ringradius * Math.cos((Math.PI / 180) * theta) + center.x;
}

function convertCoordY(ringradius, theta) {
    return ringradius * Math.sin((Math.PI / 180) * theta) + center.y;
}

// function from: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

// Add texts
function createText(text, x, y, txtanc, fs) {
    var translate = 'translate(' + x + ', ' + y + ')';
    var text = svg.append('text')
        .attr('transform', translate)
        .style('text-anchor', txtanc)
        .style('fill', 'black')
        .attr('dy', '-2.5em')
        .style('font-size', fs)
        .style('font-family', "garamond")
        .style('font-weight', 'bold')
        .text(text);
    return text;
}

// from: https://bl.ocks.org/mbostock/7555321
function wrapText(text, width, xval) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = .9, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", xval)
                        .attr("y", y)
                        .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", xval)
                            .attr("y", y )
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}

// For hover annotation, from: http://plnkr.co/edit/JpVkqaZ1AmFdBbOMwMup?p=preview
var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style('font-family', "garamond")
    .style("z-index", "10")
    .style("visibility", "hidden");

// Make link to source
var source = createText('* Data source: ', width/2 - 275, height + 10, 'start', 14);
// from: http://bl.ocks.org/d3noob/8150631
// draw text on the screen
svg.append("a")
    .append("text")
    .attr("x", width/2 -185)
    .attr("y", height -29)
    .style('font-family', "garamond")
    .style('font-weight', 'bold')
    .style('fill', '#03396c')
    .style("font-size", 14)
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .style("pointer-events", "none")
    .text("UNHCR Population Statistics");

// Draw a rectangle
svg.append("a")
    .attr("xlink:href", "http://popstats.unhcr.org/en/asylum_seekers")
    .append("rect")  
    .attr("x", width/2 -187)
    .attr("y", height -35)
    .attr("height", 18)
    .attr("width", 182)
    .style("opacity", 0)
    .attr("rx", 10)
    .attr("ry", 10);
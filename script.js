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
var explainTextX = 150;
var explainTextY = 70;
var seekerText = createText("", center.x, center.y - 15, 20);
var explanationText = createText("", explainTextX, explainTextY, 14);
createText('*Each dot represents approximately 1000 people', width/2 - 145, height + 5, 12);
createText('**Data source: UNHCR Population Statistics', width/2 - 150, height + 20, 12);

var circleLegendRecog = svg.append("circle")
                .attr("r", radius+2)
                .style("fill", "#005b96")
                .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 70) + ")")
                .append("g");
createText('= Pending', width/2 + 150 + 34, height -36, 12);

var circleLegendRecog = svg.append("circle")
                .attr("r", radius+2)
                .style("fill", results.recognized.color)
                .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 55) + ")")
                .append("g");
createText('= Recognized', width/2 + 150 + 42, height - 21, 12);

var circleLegendReject = svg.append("circle")
            .attr("r", radius+2)
            .style("fill", results.rejected.color)
            .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 40) + ")")
            .append("g");
createText('= Rejected', width/2 + 150 + 35, height - 7, 12);

var circleLegendOther = svg.append("circle")
            .attr("r", radius+2)
            .style("fill", results.other.color)
            .attr("transform", "translate(" + (width/2 + 150) + "," + (height - 25) + ")")
            .append("g");
createText('= Other Outcome', width/2 + 150 + 52, height + 9, 12);

// Build destinationClusters
Object.keys(destinationClusters).forEach(function (key) {
    var cluster = destinationClusters[key];
    cluster.x = convertCoordX(destinationClusterRingRadius, cluster.theta);
    cluster.y = convertCoordY(destinationClusterRingRadius, cluster.theta);
    createText(key, cluster.x, cluster.y - 15, 15);
});
// console.log(destinationClusters)

// Preclassify where each node is to go
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

// For hover annotation 
// from: http://plnkr.co/edit/JpVkqaZ1AmFdBbOMwMup?p=preview
var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style('font-family', "garamond")
    .style('font-weight', 'bold')
    .style("z-index", "10")
    .style("visibility", "hidden");

// Vars to build
var nodes = [];
var centerSeekers = [];
var pendings = [];
var simulation;
var circle;
var allFilenames = ['irq_13_js.json', 'irq_14_js.json', 'irq_15_js.json', 'irq_16_js.json'];
var filenames = allFilenames.slice();
var numberTracker = { };

// Text explanations
var explanations = {'irq_13_js.json':'In the years following the 2003 Iraq Invasion, the number of Iraqi asylum seekers ranged between 50 ~ 80 thousand per year.', 
    'irq_14_js.json':"Conflict began in early 2014 and escalated into a civil war with the conquest of Mosul, Iraq's second largest city, by ISIS in June.",
    'irq_15_js.json':'year3',
    'irq_16_js.json':'year4'
}

// FUNCTIONS
// Reset everything
function reset() {
    filenames = allFilenames.slice();
    seekerText.text("");
    explanationText.text("");
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
            console.log(data);
        }
        // Add text
        seekerText.text('Asylum Seekers in 20' + filename.substring(4,6));
        explanationText.text(explanations[filename]).call(wrapText,300, explainTextX);

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
                    text: ''
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
function classifyPendings() {
    if (pendings.length > 0) {
        var node = pendings.pop();
        var classification = results[node.classification];

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
        // var text = createText('blah', 700, 700, 40)
    }
} 

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
function createText(text, x, y, fs) {
    var translate = 'translate(' + x + ', ' + y + ')';
    var text = svg.append('text')
        .attr('transform', translate)
        .style('text-anchor', 'middle')
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


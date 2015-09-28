/*** dc.js charts ***/

function createCountChart(node, dimension, options){
    options = _.merge({
        width: node.style('width').replace('px', '') || 200,
        barHeight: 20,
        renderTitle: false,
        xTicks: 4,
        group: dimension.group().reduceCount()
        // colors: function that returns colors
        // label: function that returns labels, gets {key, value} as input
        // onFilter: function to callback when filter is (un)applied
        // other options applied directly to the chart object
    }, options);

    if (options.title) {
        options.renderTitle = true;
    }

    var chart = dc.rowChart(node.node());
    var values = options.group.all().map(function(d){return d.key; });
    var height = values.length * options.barHeight + 30;

    chart
        //.width(options.width)  // set below
        .height(height)
        .margins({
            top: 0,
            right: 10,
            bottom: 20,
            left: 10
        })
        .dimension(dimension)
        .group(options.group)
        .elasticX(true)
        .xAxis().ticks(options.xTicks);

    d3.keys(options).forEach(function(d){
        if (chart[d]) {
            chart[d](options[d]);
        }
    });

    if (options.xTickFormatter) {
        chart.xAxis().tickFormat(options.xTickFormatter);
    }

    if (options.onFilter){
        chart.on('filtered', options.onFilter);
    }

    chart.render();
    return chart;
}


function createSumRowChart(id, dimension, field, formatter){
    var chart = dc.rowChart('#' + id);
    var grouping = dimension.group().reduceSum(dc.pluck(field));
    var values = grouping.all().map(function(d){return d.key; });
    var height = values.length * 20 + 30;

    chart
        .width(220)
        .height(height)
        .margins({
            top: 0,
            right: 10,
            bottom: 20,
            left: 10
        })
        .dimension(dimension)
        .group(grouping)
        .elasticX(true)
        .xAxis().ticks(4);

        if (formatter!=null){
            chart.xAxis().tickFormat(function(d){
                return formatter(d);
            });
            chart.title(function(d){
                return d.key + ': ' + formatter(d.value);
            })
        }

        chart.render();
}

function createAverageRowChart(id, rows, dimension, field, formatter){
    var chart = dc.rowChart('#' + id);

    var grouping = dimension.group();
    var reducer = reductio().avg(function(d){ return d[field]})(dimension.group())
    var values = grouping.all().map(function(d){return d.key; });
    var height = values.length * 20 + 30;

    chart
        .width(220)
        .height(height)
        .margins({
            top: 0,
            right: 10,
            bottom: 20,
            left: 10
        })
        .dimension(dimension)
        .group(reducer)
        .valueAccessor(function(d){return d.value.avg})
        .elasticX(true)
        .xAxis().ticks(4);

        if (formatter!=null){
            chart.xAxis().tickFormat(function(d){
                return formatter(d);
            });
            chart.title(function(d){
                return d.key + ': ' + formatter(d.value.avg);
            })
        }

        chart.render();
}


function createBarChart(id, rows, dimension, grouping, xLabel, xFormatter, yLabel, yFormatter, valueAccessor){
    var chart = dc.barChart('#' + id);
    var values = grouping.all().map(function(d){return d.key; });
    var width = values.length * 34 + 30;
    var scale = d3.scale.ordinal().domain(values);

    chart
        .width(width)
        .height(300)
        .x(scale)
        .xUnits(dc.units.ordinal)
        .brushOn(false)
        .xAxisLabel(xLabel)
        .yAxisLabel(yLabel)
        .dimension(dimension)
        .group(grouping)
        .elasticY(true)
        .title(function(){return ' '})

        // .title(function(d){
        //     return xFormatter(d.key) + ': ' + yFormatter(d.value);
        // });

    if (valueAccessor != null){
        chart.valueAccessor(valueAccessor);
    }

    chart.xAxis().tickFormat(xFormatter);
    chart.yAxis().tickFormat(yFormatter);

    chart.render();
}


/******* DC JS Helper functions ************/

// filter for values that must be a subset of the values list on each row
function subsetFilter(dimension, values){
    if (values.length) {
        dimension.filterFunction(function (d) {
            return isSubsetArray(values, d)
        });
    }
    else {
        dimension.filterAll();
    }
    return values;
}

// create a group similar to dimension.group(), but based on keys extracted from an array (for row[key])
function groupingByKey(dimension, key){
    return {
        all: function() {
            var counts = {};
            var results = dimension.group().reduceCount().all();
            results.forEach(function(d){
                d.key.forEach(function(v){ counts[v] = (counts[v] || 0) + d.value});
            });
            return d3.map(counts).entries().sort(function(a,b){return d3.ascending(a.key, b.key)});
        }
    }
}


/**** NVD3 based charts **********/



//data needs value, label, color, and percent
function createPieChart(data, node, width, height, options){
    options = _.merge({
        units: ''
    }, options);

    node.html('');

    nv.addGraph(function() {
        var chart = nv.models.pieChart()
            .margin({top: 0, right: 0, bottom: 0, left: 0})
            .x(function(d) { return d.label })
            .y(function(d) { return d.percent })
            .showLegend(false)
            .showLabels(false)
            .color(data.map(function(d){return d.color}))
            .valueFormat(function(d){return d3.format('.0f')(d) + '%'})
            .width(width)
            .height(height);

        var sortedData = data.slice();
        sortedData.sort(function(a, b){return d3.descending(a.percent, b.percent)});
        node.append('ul')
            .classed('inlineTop legend', true)
            .selectAll('li')
            .data(sortedData)
            .enter().append('li')
            .classed('legendElement small', true)
            .each(function(d){
                var node = d3.select(this);
                node.append('div').classed('inlineTop', true).style('background', d.color);
                var percentLabel = ((d.percent >= 1)? Math.round(d.percent): '< 1') + '%';
                var label = '<b>' + percentLabel + ' ' + d.label;
                if (d.value != null){
                    label += '</b><br/>(' + formatNumber(d.value) + ' ' + options.units + ')';
                }
                node.append('div').classed('inlineTop', true).html(label);
                if (d.tooltip){
                    node.attr('title', d.tooltip);
                }
            });

        node.append('svg')
            .classed('inlineTop', true)
            .style({
                width: width,
                height: height
            })
            .datum(data)
            .call(chart);

        return chart;
    });
}
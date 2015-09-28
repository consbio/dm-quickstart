var pageLoadStart = new Date().getTime();

var config = {};
var index = d3.map();
var features = null;
var featureIndex = d3.map();
var visibleFeatures = d3.map();
var data = null;
var cf = null;
var dimensions = {};
var map;
var fieldConfigMap = d3.map();
var basemaps = {
    'ESRI Ocean': L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri',
        maxZoom: 13
    }),
    'ESRI Topo': L.tileLayer('//{s}.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
        subdomains: ['server', 'services']
    }),
    'ESRI Gray': L.tileLayer('//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
        subdomains: ['server', 'services']
    }),
    'ESRI Imagery': L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
};



d3.json('static/config.json', function(error, json) {
    if (error) return console.warn(error);
    config = json;

    console.log('config', config);
    loadFeatures();
    loadData();
});


function loadFeatures() {
    omnivore.topojson('static/' + config.features.file)
        .on('ready', function(){
            this.getLayers().forEach(function(feature){
                feature.on('click', function (e) {
                    selectUnit(e.target.feature.id);
                });
                var id = feature.feature.id;
                featureIndex.set(id, feature);
                visibleFeatures.set(id, true);
            });
            features = this;

            onLoad();
            console.log('loaded features by',new Date().getTime() - pageLoadStart, 'ms');
        });
}


function loadData() {
    var fieldConfig = config.data.fieldConfig || [];
    var mapFields = fieldConfig.filter(function(d){ return d.parser === 'map' }).map(function(d){ return d.field });
    fieldConfig.forEach(function(d) {
        fieldConfigMap.set(d.field, d);
    });

    d3.csv('static/' + config.data.file,
        function(row, i) {
            try {
                if (i === 0) {
                    d3.keys(row).forEach(function(d) {
                        fieldConfigMap.set(d, _.merge({
                            field: d,
                            alias: d
                        }, fieldConfigMap.get(d) || {}))
                    })
                }

                castFields(row, mapFields);

                mapFields.forEach(function (f) {
                    row[f] = decodeDictField(row[f]);
                    //row[f + '_present'] = d3.set(row[f].keys()); //TODO
                });
            }
            catch (ex){
                console.error(ex);
            }
            index.set(row.id, row);
            return row;
        },
        function(rows){
            try {
                data = rows;

                cf = crossfilter(rows);
                dimensions.id = cf.dimension(function(d){return d.id});
                config.data.dimensions.forEach(function(f){
                    dimensions[f] = cf.dimension(function(d){return d[f]; });
                });
                //TODO: for each field in field config where parser == 'map'
                //mapFields.forEach(function(f){
                //    var key = f + '_present';
                //    dimensions[key] = cf.dimension(function(d){return d[key].values(); });
                //});

            }
            catch (ex){
                console.error(ex);
            }

            onLoad();
            console.log('loaded data by',new Date().getTime() - pageLoadStart, 'ms');
        }
    );
}


var onLoad = _.after(2, load);
function load() {

    var basemap = (config.map.basemap && basemaps[config.map.basemap] != null)? basemaps[config.map.basemap]: basemaps['ESRI Topo'];
    map = L.map('Map', {
        layers: [basemap]
    });
    features.addTo(map);
    map.fitBounds(features.getBounds());

    map.addControl(L.control.zoomBox({modal: true, position:'topright'}));
    if (config.map && config.map.geonamesUser) {
        map.addControl(L.control.geonames({username: config.map.geonamesUser, position:'topright'}));
    }
    L.control.layers(basemaps, null, {position: 'bottomright'}).addTo(map);
    d3.select('.leaflet-control-layers-toggle').html('<i class="fa fa-globe"></i> basemaps');


    var barHeight = 20;
    var chartWidth = 440;
    var colors = function(){return '#9ecae1'};

    d3.select('#Filter').selectAll('div')
        .data(config.data.dimensions).enter()
        .append('div')
        .each(function(d){
            var container = d3.select(this);

            container.append('h4').text(fieldConfigMap.get(d).alias);
            var chartNode = container.append('div').classed('chart', true);
            chartNode.append('div')
                .append('div')
                .classed('reset small', true)
                .style('display', 'none')
                .text('reset')
                .on('click', handleChartReset);
            container.append('div').classed('small quiet center', true).text('count');

            createCountChart(chartNode, dimensions[d], {
                barHeight: barHeight,
                colors: colors,
                //xTickFormatter: intFormatter, //TODO
                onFilter: updateMap,
                width: chartWidth
            });

        });
}


function updateMap() {
    var visibleIDs = getIDs(dimensions.id);

    console.log(visibleIDs.size() + ' now visible');
    featureIndex.keys().forEach(function(id){
        var wasVisible = visibleFeatures.get(id);
        var isVisible = visibleIDs.has(id);
        if (isVisible != wasVisible) {
            d3.select(featureIndex.get(id)._path).classed('hidden', !isVisible);
        }
        visibleFeatures.set(id, isVisible);
    })
}


// reset handler
function handleChartReset() {
    var chartNode = d3.select(this).node().parentNode.parentNode;
    console.log('chart node', chartNode)
    var chart = _.find(dc.chartRegistry.list(), function(d){
        console.log(d.root().node())
        return d.root().node() == chartNode});
    chart.filterAll();
    chart.redrawGroup();  // for whatever reason, this is not done automatically
}


//TODO: replace this with React!
function selectUnit(id) {
    console.log('select ', id);
}


/******* DOM connections *********/
function updateSidebarHeight() {
    //fix height of sidebar
    //TODO: flexbox will probably handle this better!
    d3.select('#Sidebar').style('height', (window.innerHeight - (36 + 30)) + 'px'); //36 is height of top bar, 30 is height of bottom bar
}
window.onresize = updateSidebarHeight;


// Tab handling
d3.selectAll('.tabs li').on('click', function() {
    selectTab(d3.select(this));
});
function selectTab(node){
    var id = node.attr('data-tab');
    d3.select(node.node().parentNode).selectAll('li.active').classed('active', false);
    node.classed('active', true);
    d3.select(node.node().parentNode.parentNode).selectAll('.tab').classed('hidden', function(d){
        return d3.select(this).attr('id') != id;
    });
}

/********** Helper functions **********/

function getIDs(dimension){
    return d3.set(dimension.top(Infinity).map(function (d) { return d.id }));
}

// TODO: figure out how to turn this on in config
var intFormatter = d3.format(',.0f');
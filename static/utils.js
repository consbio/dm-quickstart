// D3 helper functions

//utility function
function theItem(d){return d};


// Cast fields to appropriate data type during load of CSV
function castFields(row, skipFields){
    var fields = d3.keys(row);
    if (skipFields){
        fields = fields.filter(function(d){return skipFields.indexOf(d) == -1});
    }

    fields.forEach(function(d){
        if (value == '') return;
        var value = +row[d];
        if (!(isNaN(value) || (value.trim && value.trim() == ''))){
            row[d] = value;
        }
    }, this);
}


//D3 set shims to support set operations
//NOTE: this is handled in similar form by _.intersection
function setIntersection(set1, set2){
    var intersection = d3.set([]);
    var left, right;
    if (set1.size() < set2.size()){
        left = set1;
        right = set2;
    }
    else {
        left = set2;
        right = set1;
    }
    left.forEach(function(d){
        if (right.has(d)){
            intersection.add(d);
        }
    });
    return intersection;
}


function setDifference(set1, set2){
    var difference = d3.set([]);
    set1.forEach(function(d){
        if (!set2.has(d)){
            difference.add(d);
        }
    });
    return difference;
}


function isSubset(set1, set2) {
    // true if set1 is subset of set2
    return _.every(set1.values(), function(d){return set2.has(d)});
}

function isSubsetArray(arr1, arr2) {
    return _.every(arr1, function(d){ return arr2.indexOf(d) != -1});
}


function formatValue(value, formatter, units){
    return formatter(value) + ((units != null)? units: '');
}


//TODO: is this still the right way to do this?
function formatNumber(number){
    return number.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}


//TODO: replace with function from lodash or remove (not currently used)
function valueSortedKeys(obj, descending){
    var items = d3.keys(obj).map(function(d){ return [d, obj[d]]}, this);
    if (descending){
        items.sort(function(a ,b){return (a[1] > b[1])? -1: 1});
    }
    else {
        items.sort(function(a ,b){return (a[1] < b[1])? -1: 1});
    }
    return items.map(function(d){return d[0]});
}



// Allows multiple entries per key and allows arbitrary nesting
function createIndexMultiple(rows, props){
    var index = d3.nest();
    props.forEach(function(p){
        index = index.key(function(d){return d[p]});
    }, this);
    return index.map(rows, d3.map);
}


// Crossfilter helper functions

// Filter function for using a d3 set
function filterSet(d3Set){
    return function(d){return d3Set.has(d);}
}




/************ General Math Utils *****************/
function weightedMean(values, weights){
    if (values.length != weights.length){
        throw 'ValueError: values and weights lengths must match'
    }
    var total = d3.sum(weights);
    return values.reduce(function(prev, d, i){return prev + d * weights[i] / total}, 0);
}




function calculateDifference(value, baseline){
    return value - baseline;
}


function calculateDifferencePercent(value, baseline){
    if (baseline == 0){
        baseline = 1e-24;
    }
    return 100 * ((value - baseline) / baseline);
}


function calculateStdAnom(value, baselineMean, baselineStd){
    return (value - baselineMean) / baselineStd;
}


function convertUnits(value, fromUnit, toUnit){
    //first key is fromUnit, nested key is toUnit
    //units are abbreviated
    var factors = {
        'ac': {
            'km2': 0.004046856
        }
    };

    if (!(factors[fromUnit] && factors[fromUnit][toUnit])){
        throw "Unsupported unit conversion: " + fromUnit + ' to ' + toUnit;
    }

    return factors[fromUnit][toUnit] * value;
}

function pluralize(text, count){
    var suffix = 's';  //TODO: may need to improve this
    return (count > 1)? text + suffix: text;
}




/*************** General Utils ******************/

//derived from: http://stackoverflow.com/questions/5448545/how-to-retrieve-get-parameters-from-javascript
function getQueryParams() {
    function transformToAssocArray( prmstr ) {
        var params = {};
        var prmarr = prmstr.split("&");
        for ( var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            params[tmparr[0]] = tmparr[1];
        }
        return params;
    }
    var prmstr = window.location.search.substr(1);
    return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}


function setQueryParams(url, queryParams){
    if (!queryParams) return url;
    return url + '?' + d3.entries(queryParams).map(function(d){return d.key + '=' + d.value}).join('&');
}


/************** Custom data encoding utils ******/

function boolFieldsToSet(row, key, fields, delete_original){
    row[key] = d3.set(fields.filter(function(d){
        return row[d] === 1 || row[d] == "1";
    }));
    if (delete_original){
        fields.forEach(function(d){
            delete row[d];
        });
    }
}


function decodeBitsetField(row, field, bitsetFields){
    var bitset = parseInt(row[field]).toString(2);
    //add back leading 0's
    while (bitset.length < bitsetFields.length){
        bitset = '0' + bitset;
    }
    bitsetFields.forEach(function(d, i){
        row[d] = parseInt(bitset[i]);
    }, this);
}

// Note: signature changed from other projects that used this!
// Decode a pipe delimited, dict style text field to a d3 map, parsing value to float if possible
// A:1|B:2 -> d3.map({A:1, B:2})
function decodeDictField(text){
    if (text == null || text == '') return d3.map();

    var out = d3.map();
    text.split('|').forEach(function(d) {
        var split = d.split(':');
        var parsed = parseFloat(split[1]);
        out.set(split[0], (!isNaN(parsed))? parsed:  split[1]);
    });
    return out;
}




// Unpack values packed into a string w/ pipes:  10||2|1|4 => [10,0,2,1,4] * factor
//factor defaults to 1
function unpackPipeDelimValues(values_str, factor){
    if (values_str == null || values_str == undefined || values_str == ''){
        return [];
    }

    if (factor == null){
        factor = 1.0;
    }

    return values_str.split('|').map(function(d){
        return (d) ? parseFloat(d)  * factor : 0;
    });
}


// For a given collection of strings, some of which may be duplicative, store the index of the first instance, and replace
// later instances with a pointer to "look back" to that first index to retrieve that value later.
var LookBackEncoder = (function(){
        function LookBackEncoder(data){
            this._by_value = {};
            this._by_index = {};
            if (data != null && data.length != null && data.length > 0){
                data.forEach(function(value, index){
                    this._by_index[index] = value;
                }, this);
            }
        }
        LookBackEncoder.prototype.encode = function(value, index){
            if (this._by_value[value] != null){
                return '~' + this._by_value[value];
            }
            this._by_value[value] = index;
            this._by_index[index] = value;
            return value;
        };
        LookBackEncoder.prototype.decode = function(value){
            if (!value){return value}
            if (!this._by_index){
                throw 'No data in index';
            }
            if (value.search(/~\d+/) == 0){
                var index = value.replace(/~/, '');
                if (this._by_index[index] != null){
                    return this._by_index[index];
                }
                throw 'Index not in data';
            }
            return value;
        };
    return LookBackEncoder;
    })();

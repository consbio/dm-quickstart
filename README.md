# Dimensional Mapping - Quickstart
This project is intended to make it easier to start up a new project to do
dimensional mapping of features from a topojson file plus associated attributes 
in a CSV file.


## Work in progress!
Pretty much anything is subject to change at this point.


## Basic assumptions
* features are contained in a topojson file, and contain an 'id' field set for 
each feature (not in properties, use feature-level id field instead)
* attributes are contained in a CSV file, and are joined one to one to features
using the 'id' field.
* one to many attributes can be represented shorthand format in the CSV: 
'first_key:first_value|second_key:second_value'.  These will be parsed into



## Config
You must provide a config file (`static/config.json`) with the data structure
for your project.

Example:

```
{
  "data": {
    "file": "attributes.csv",  // filename of attributes CSV, in /static
    "fieldConfig": [  // List any fields that require aliases or parsers 
      {
        "field": "field1",
        "alias": "First Field"
      },
      {
        "field": "field2",
        "alias": "Second Field",
        "parser": "map"  // Only special parser at present.  Uses shorthand form of one to many key:value pairs
      }
    ],
    "dimensions": ["field1"]  // specifies the dimensions that will be used for dimensional filtering
  },
  "features": {
    "file": "features.json"  // filename of features topojson, in /static
  },
  "map": {
    "basemap": "ESRI Topo",  // default basemap; will default to 'ESRI Topo' if not provided
    "geonamesUser": "your.username"  // Geonames username; required to use Leaflet.Geonames widget (will not be added if this is username is not specfied)
  }
}
```

## Dependencies 
* Leaflet
* D3
* dc.js
* lodash
* crossfilter
* [Leaflet.ZoomBox](https://github.com/consbio/Leaflet.ZoomBox)
* [Leaflet.Geonames](https://github.com/consbio/Leaflet.Geonames)

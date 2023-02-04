# gps2road

Purpose: find most likely road given a GPS point

gps2road({ lat: 84.123, lon: -50.345 }) => { 
  name, 
  type, 
  number, 
  ramp,
  mileMarkers: { // only if type is interstate or state
   min: { number: 3, lat, lon }, // 0 is always the smaller "number"
   max: { number: 4, lat, lon },
  ],
  geojson, // geojson of the road segment
}

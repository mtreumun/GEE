// Importa ALOS Digital Elevation Model
var datasetALOS = ee.Image('JAXA/ALOS/AW3D30/V2_2');

// Lee polygons
var polygons = ee.FeatureCollection(polygons);

// Calcula altitud, slope y aspect
var elevationsALOS = datasetALOS.reduceRegions({
  collection: polygons,
  reducer: ee.Reducer.mean(),
  scale: 30
});

var slopeALOS = ee.Terrain.slope(datasetALOS);
var aspectALOS = ee.Terrain.aspect(datasetALOS);

// Agrega slope y aspect a la tabla
elevationsALOS = elevationsALOS.map(function(feature) {
  var slopeValueALOS = slopeALOS.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: feature.geometry(),
    scale: 30
  }).get('slope');
  
  var aspectValueALOS = aspectALOS.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: feature.geometry(),
    scale: 30
  }).get('aspect');
  
  return feature.set('slope_ALOS', slopeValueALOS).set('aspect_ALOS', aspectValueALOS);
});

// Importa el conjunto de datos M-TPI
var mTPI = ee.Image('CSP/ERGo/1_0/Global/ALOS_mTPI');

// Calcula el M-TPI para cada polígono
var mTPIResults = mTPI.reduceRegions({
  collection: polygons,
  reducer: ee.Reducer.mean(),
  scale: 30
});

// Importa sentinel-2 y filtra por fechas y polygons
var sentinelCollection = ee.ImageCollection('COPERNICUS/S2')
  .filterDate('2020-12-01', '2020-12-31') // Define el rango de fechas de interés
  .filterBounds(polygons); // Define la ubicación de interés (polígonos)

// Calcula el NDVI y NDWI de sentinel
function calculateNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

function calculateNDWI(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  return image.addBands(ndwi);
}

function addBand5(image) {
  var band5 = image.select('B5');
  return image.addBands(band5);
}

var sentinelWithNDVI = sentinelCollection.map(calculateNDVI);
var sentinelWithNDWI = sentinelCollection.map(calculateNDWI);
var sentinelWithBand5 = sentinelCollection.map(addBand5);

// Calcula el valor promedio para cada elemento de polygons
var meanNDVI = sentinelWithNDVI.select('NDVI').reduce(ee.Reducer.mean());
var meanNDWI = sentinelWithNDWI.select('NDWI').reduce(ee.Reducer.mean());
var meanBand5 = sentinelWithBand5.select('B5').reduce(ee.Reducer.mean());

// Exporta a drive un csv
var ndviByPolygon = meanNDVI.reduceRegions({
  collection: polygons,
  reducer: ee.Reducer.mean(),
  scale: 10
});
var ndwiByPolygon = meanNDWI.reduceRegions({
  collection: polygons,
  reducer: ee.Reducer.mean(),
  scale: 10, 
});
var band5ByPolygon = meanBand5.reduceRegions({
  collection: polygons,
  reducer: ee.Reducer.mean(),
  scale: 10
});

Export.table.toDrive({
  collection: band5ByPolygon,
  description: 'mean_band5_by_polygon',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: ndwiByPolygon,
  description: 'mean_ndwi_by_polygon',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: elevationsALOS,
  description: 'alt_slope_aspect_poly_ALOS',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: mTPIResults,
  description: 'mTPI_poly',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: ndviByPolygon,
  description: 'mean_ndvi_poly',
  fileFormat: 'CSV'
});

#!/usr/bin/env node
/**
 * merge-same-name-polygons.mjs
 *
 * Merges GeoJSON polygons with the same NAME attribute into MultiPolygons.
 * Also generates a separate centroid points GeoJSON for labels.
 *
 * Usage:
 *   node scripts/merge-same-name-polygons.mjs <input.geojson> <output.geojson>
 *
 * Output:
 *   - <output.geojson> - Merged polygons for territory fills
 *   - <output_labels.geojson> - Centroid points for labels (one per unique NAME)
 *
 * Example:
 *   node scripts/merge-same-name-polygons.mjs .cache/geojson/world_1650.geojson .cache/geojson/world_1650_merged.geojson
 */

import { readFileSync, writeFileSync } from 'node:fs';
import * as turf from '@turf/turf';

/**
 * Merge polygons with the same NAME into MultiPolygons
 * @param {object} geojson - Input GeoJSON FeatureCollection
 * @returns {{ polygons: object, labels: object }} - Merged polygons and label points
 */
function mergeByName(geojson) {
  // Group features by NAME
  const groups = new Map();

  for (const feature of geojson.features) {
    const name = feature.properties?.NAME || 'Unknown';

    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(feature);
  }

  // Merge each group
  const mergedFeatures = [];
  const labelPoints = [];

  for (const [name, features] of groups) {
    let mergedFeature;

    if (features.length === 1) {
      // Single feature, keep as-is
      mergedFeature = features[0];
      mergedFeatures.push(mergedFeature);
    } else {
      // Multiple features with same name - merge into MultiPolygon
      try {
        // Collect all coordinates
        const polygons = features
          .map((f) => {
            if (f.geometry.type === 'Polygon') {
              return f.geometry.coordinates;
            }
            if (f.geometry.type === 'MultiPolygon') {
              return f.geometry.coordinates;
            }
            return null;
          })
          .filter(Boolean);

        // Flatten MultiPolygon coordinates
        const allPolygonCoords = [];
        for (const coords of polygons) {
          if (Array.isArray(coords[0][0][0])) {
            // MultiPolygon - flatten
            for (const poly of coords) {
              allPolygonCoords.push(poly);
            }
          } else {
            // Polygon
            allPolygonCoords.push(coords);
          }
        }

        // Use properties from the first feature
        const properties = { ...features[0].properties };

        // Create merged MultiPolygon
        mergedFeature = turf.multiPolygon(allPolygonCoords, properties);
        mergedFeatures.push(mergedFeature);

        console.log(`  Merged ${features.length} features for "${name}"`);
      } catch (error) {
        console.error(`  Warning: Failed to merge "${name}": ${error.message}`);
        // Keep original features if merge fails
        mergedFeature = features[0];
        mergedFeatures.push(...features);
      }
    }

    // Generate label point (point on surface of the largest polygon)
    try {
      // Find the largest polygon by area for label placement
      let largestArea = 0;
      let largestPoly = null;

      if (mergedFeature.geometry.type === 'Polygon') {
        largestPoly = mergedFeature;
      } else if (mergedFeature.geometry.type === 'MultiPolygon') {
        // Find the largest polygon in the MultiPolygon
        for (const coords of mergedFeature.geometry.coordinates) {
          const poly = turf.polygon(coords);
          const area = turf.area(poly);
          if (area > largestArea) {
            largestArea = area;
            largestPoly = poly;
          }
        }
      }

      if (largestPoly) {
        // Use pointOnFeature to ensure the point is inside the polygon
        const labelPoint = turf.pointOnFeature(largestPoly);
        labelPoint.properties = { ...mergedFeature.properties };
        labelPoints.push(labelPoint);
      }
    } catch (error) {
      console.error(`  Warning: Failed to create label point for "${name}": ${error.message}`);
    }
  }

  return {
    polygons: turf.featureCollection(mergedFeatures),
    labels: turf.featureCollection(labelPoints),
  };
}

// Main
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node merge-same-name-polygons.mjs <input.geojson> <output.geojson>');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;
  const labelsPath = outputPath.replace('.geojson', '_labels.geojson');

  console.log(`Reading: ${inputPath}`);
  const inputData = readFileSync(inputPath, 'utf-8');
  const geojson = JSON.parse(inputData);

  console.log(`Input features: ${geojson.features.length}`);

  const { polygons, labels } = mergeByName(geojson);

  console.log(`Output polygons: ${polygons.features.length}`);
  console.log(`Output label points: ${labels.features.length}`);

  writeFileSync(outputPath, JSON.stringify(polygons));
  console.log(`Written: ${outputPath}`);

  writeFileSync(labelsPath, JSON.stringify(labels));
  console.log(`Written: ${labelsPath}`);
}

main();

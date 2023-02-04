declare module "shape2geohash" {
  import type { GeoJSON } from 'geojson';
  import type {WritableStream} from 'stream/web';
  export type shape2geohashOptions = {
    precision?: number, // default 6
    hashMode?: "intersect" | "envelope" | "insideOnly" | "border", // default intersect
    minIntersect?: number, // default 0
    allowDuplicates?: boolean, // default true
    customWriter?: WritableStream,
  };
  export default function(shp: GeoJSON, options?: shape2geohashOptions): Promise<string[]>;
}

export function minspeed(bucket: number, buckets: number[]) {
  if (bucket === 0) return 0;
  return buckets[bucket-1]!;
}

export function maxspeed(bucket: number, buckets: number[]) {
  if (bucket === buckets.length) return 100;
  return buckets[bucket]!;
}

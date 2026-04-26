declare const BucketNameBrand: unique symbol;
export type BucketName = string & { readonly [BucketNameBrand]: true };

function asBucketName(value: string): BucketName {
  return value as BucketName;
}

export const DEV_BUCKET: BucketName = asBucketName('world-history-map-tiles-dev');
export const PROD_BUCKET: BucketName = asBucketName('world-history-map-tiles-prod');

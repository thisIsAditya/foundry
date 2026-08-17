import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type { Env } from '../env.js';
import type { ObjectStore } from './object-store.js';

export function createS3ObjectStore(env: Env): ObjectStore {
  const bucket = env.AWS_S3_UPLOADS_BUCKET;
  if (bucket === undefined) {
    throw new Error('AWS_S3_UPLOADS_BUCKET is required for the ingestion worker');
  }
  const client = new S3Client({
    region: env.AWS_REGION,
    ...(env.AWS_S3_ENDPOINT === undefined
      ? {}
      : {
          endpoint: env.AWS_S3_ENDPOINT,
          forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE !== 'false',
        }),
    ...(env.AWS_ACCESS_KEY_ID === undefined || env.AWS_SECRET_ACCESS_KEY === undefined
      ? {}
      : {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        }),
  });

  return {
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },
    async get(key) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      if (bytes === undefined) {
        throw new Error(`Object not found: ${key}`);
      }
      return Buffer.from(bytes);
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
  };
}

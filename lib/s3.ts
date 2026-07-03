import { S3Client } from '@aws-sdk/client-s3'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export const s3 = new S3Client({
  forcePathStyle: true,
  region: process.env.SUPABASE_S3_REGION ?? 'eu-west-3',
  endpoint: `${supabaseUrl}/storage/v1/s3`,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
  },
})

export const S3_BUCKET = 'certibase-imports'

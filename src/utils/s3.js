const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const getContentType = (ext) => {
  const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
  return types[ext] || 'image/png';
};

const createPresignedUrl = async (key, ext) => {
  const command = new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: key,
    ContentType: getContentType(ext),
  });

  const presignUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const url = `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

  return { presignUrl, url, key };
};

module.exports = { createPresignedUrl };

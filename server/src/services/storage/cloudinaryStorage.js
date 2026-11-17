const { Readable } = require('stream');
const { v2: cloudinary } = require('cloudinary');
const ApiError = require('../../utils/ApiError');

/**
 * Production storage: files are uploaded as "private" assets, so Cloudinary will not
 * serve them from a public URL. To read one, the API creates a download link that
 * expires in 60 seconds, fetches it server-side and streams it to the authorized user.
 *
 * Key format: "<resourceType>|<publicId>|<format>"
 */
function createCloudinaryStorage({ cloudName, apiKey, apiSecret, folder }) {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary storage needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  const parseKey = (key) => {
    const [resourceType, publicId, format] = String(key).split('|');
    if (!resourceType || !publicId || !format) throw ApiError.notFound('File not found');
    return { resourceType, publicId, format };
  };

  const signedUrl = (key) => {
    const { resourceType, publicId, format } = parseKey(key);
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });
  };

  const fetchFile = async (key) => {
    const response = await fetch(signedUrl(key));
    if (!response.ok) throw ApiError.notFound('File not found');
    return response;
  };

  return {
    name: 'cloudinary',

    save(buffer) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, type: 'private', resource_type: 'auto' },
          (error, result) => {
            if (error) return reject(error);
            return resolve(`${result.resource_type}|${result.public_id}|${result.format}`);
          }
        );
        stream.end(buffer);
      });
    },

    async openStream(key) {
      const response = await fetchFile(key);
      return Readable.fromWeb(response.body);
    },

    async readBuffer(key) {
      const response = await fetchFile(key);
      return Buffer.from(await response.arrayBuffer());
    },
  };
}

module.exports = { createCloudinaryStorage };

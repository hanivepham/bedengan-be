import cloudinary from '../config/cloudinary';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
}

/**
 * Mengunggah buffer file atau path file lokal ke Cloudinary menggunakan upload_stream / uploader.upload
 * @param {Buffer | string} fileBufferOrPath - Buffer file dari req.file.buffer atau path string
 * @param {string} [folder='bedengan'] - Nama folder di Cloudinary (misal 'bedengan/catalogs', 'bedengan/catalogs/items')
 * @returns {Promise<CloudinaryUploadResult>}
 */
export const uploadToCloudinary = (
  fileBufferOrPath: Buffer | string,
  folder: string = 'bedengan'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    if (!fileBufferOrPath) {
      return reject(new Error('File tidak ditemukan untuk diunggah ke Cloudinary.'));
    }

    // Jika string (misal path file lokal dari diskStorage)
    if (typeof fileBufferOrPath === 'string') {
      cloudinary.uploader.upload(
        fileBufferOrPath,
        {
          folder,
          resource_type: 'image'
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Gagal mengunggah file ke Cloudinary'));
          }
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            bytes: result.bytes,
            format: result.format
          });
        }
      );
      return;
    }

    // Jika Buffer (memoryStorage)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Gagal mengunggah buffer ke Cloudinary'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format
        });
      }
    );

    uploadStream.end(fileBufferOrPath);
  });
};

/**
 * Menghapus file dari Cloudinary berdasarkan public_id
 * @param {string} publicId - ID publik file pada Cloudinary
 * @returns {Promise<any>}
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'image'
  });
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary
};


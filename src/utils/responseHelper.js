/**
 * Response Helper standar untuk API Bedengan Xplore
 */

const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const payload = {
    status: 'error',
    message
  };

  if (errors !== null) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Mengubah path gambar relatif menjadi URL penuh dinamis berbasis host request
 * @param {object} req - Express request object
 * @param {string} imagePath - Path gambar relatif atau URL
 * @returns {string|null} URL lengkap atau null
 */
const formatImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${protocol}://${host}${cleanPath}`;
};

module.exports = {
  successResponse,
  errorResponse,
  formatImageUrl
};

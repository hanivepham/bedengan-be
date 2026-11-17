import { Request, Response } from 'express';

/**
 * Response Helper standar untuk API Bedengan Xplore
 */

export const successResponse = (res: Response, message: string, data: any = null, statusCode: number = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

export const errorResponse = (res: Response, message: string, statusCode: number = 500, errors: any = null) => {
  const payload: any = {
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
 * @param req - Express request object
 * @param imagePath - Path gambar relatif atau URL
 * @returns URL lengkap atau null
 */
export const formatImageUrl = (req: Request | any, imagePath: string | null) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const protocol = req.protocol || 'http';
  const host = req.get ? req.get('host') : (req.headers ? req.headers.host : 'localhost:5000');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${protocol}://${host}${cleanPath}`;
};

export default {
  successResponse,
  errorResponse,
  formatImageUrl
};


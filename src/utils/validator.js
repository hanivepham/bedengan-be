/**
 * Helper Validasi Input untuk API Bedengan Xplore
 */

const isEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

const validateEmail = (email) => {
  if (isEmpty(email)) {
    return { isValid: false, error: 'Email wajib diisi!' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(String(email).trim())) {
    return { isValid: false, error: 'Format email tidak valid! Contoh: user@example.com' };
  }
  return { isValid: true, sanitized: String(email).trim().toLowerCase() };
};

const validatePhone = (phone, options = {}) => {
  const { allowLandline = false, fieldName = 'Nomor telepon' } = options;

  if (isEmpty(phone)) {
    return { isValid: false, error: `${fieldName} wajib diisi!` };
  }

  // Bersihkan spasi, strip, kurung, dan titik
  const cleaned = String(phone).replace(/[\s\-().]/g, '');

  // Seluler/WA Indonesia: 08xx, 628xx, +628xx (9 s/d 14 digit)
  const mobileRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

  // PSTN / Telepon Darat (PSTN Jawa Timur/Malang 0341, dsb)
  const landlineRegex = /^(\+62|62|0)(2[1-9]|3[1-9]|4[1-9]|5[1-9]|6[1-9]|7[1-9]|9[1-9])[0-9]{5,8}$/;

  let isMatch = mobileRegex.test(cleaned);
  let isLandline = false;

  if (!isMatch && allowLandline) {
    if (landlineRegex.test(cleaned)) {
      isMatch = true;
      isLandline = true;
    }
  }

  if (!isMatch) {
    const hint = allowLandline
      ? 'Gunakan format nomor seluler (08xxxxxxxxxx) atau telepon area (misal 0341xxxxxx).'
      : 'Gunakan format seluler / WhatsApp Indonesia yang valid (contoh: 081234567890 atau 6281234567890).';
    return {
      isValid: false,
      error: `Format ${fieldName} tidak valid! ${hint}`
    };
  }

  // Normalisasi nomor ke awalan '0' lokal
  let normalized = cleaned;
  if (normalized.startsWith('+62')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('62')) {
    normalized = '0' + normalized.slice(2);
  }

  return { isValid: true, normalized };
};

const validateOperatingHours = (hoursStr) => {
  if (isEmpty(hoursStr)) {
    return { isValid: false, error: 'Jam operasional wajib diisi!' };
  }

  const raw = String(hoursStr).trim();
  const hoursRegex = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d(\s*WIB)?$/i;

  if (!hoursRegex.test(raw)) {
    return {
      isValid: false,
      error: 'Format jam operasional tidak valid! Format wajib: HH:mm - HH:mm (contoh: 08:00 - 17:00 atau 08:00 - 17:00 WIB).'
    };
  }

  const parts = raw.split('-');
  const openTime = parts[0].trim();
  const closePart = parts[1].trim();
  const closeTime = closePart.split(/\s+/)[0];
  const hasWib = /WIB$/i.test(closePart);

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes <= openMinutes) {
    return {
      isValid: false,
      error: `Jam tutup (${closeTime}) harus lebih besar daripada jam buka (${openTime})!`
    };
  }

  const formatted = `${openTime} - ${closeTime}${hasWib ? ' WIB' : ''}`;
  return { isValid: true, formatted };
};

const validateEnum = (value, allowedValues, fieldName = 'Field') => {
  if (isEmpty(value)) {
    return { isValid: false, error: `${fieldName} wajib diisi!` };
  }
  const valLower = String(value).trim().toLowerCase();
  if (!allowedValues.includes(valLower)) {
    return {
      isValid: false,
      error: `${fieldName} harus salah satu dari: ${allowedValues.map((v) => `'${v}'`).join(', ')}.`
    };
  }
  return { isValid: true, value: valLower };
};

const validateLength = (value, max, fieldName = 'Field') => {
  if (value && String(value).length > max) {
    return {
      isValid: false,
      error: `${fieldName} tidak boleh melebihi ${max} karakter!`
    };
  }
  return { isValid: true };
};

module.exports = {
  isEmpty,
  validateEmail,
  validatePhone,
  validateOperatingHours,
  validateEnum,
  validateLength
};
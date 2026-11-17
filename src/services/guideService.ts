import { Request } from 'express';
import GuideModel from '../models/GuideModel';
import ConfigModel from '../models/ConfigModel';
import { formatImageUrl } from '../utils/responseHelper';
import { isEmpty, validatePhone, validateEnum, validateLength } from '../utils/validator';
import { CreateEmergencyContactDTO, CreateGuideRuleDTO } from '../types';

export class GuideServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const guideService = {
  /**
   * Mengambil data aturan, etika, peringatan, peta evakuasi, dan kontak darurat
   */
  getGuidesData: async (req: Request | any) => {
    const configs = await ConfigModel.getByKeys([
      'evacuation_map_url',
      'etiquette_title',
      'etiquette_description'
    ]);

    const allRules = await GuideModel.findAllRules();

    const rules = allRules.filter((r: any) => r.type === 'rule');
    const warnings = allRules.filter((r: any) => r.type === 'warning');
    const etiquette = allRules.filter((r: any) => r.type === 'etiquette');

    const emergencyContacts = await GuideModel.findAllContacts();

    return {
      evacuation_map_url: formatImageUrl(req, configs.evacuation_map_url || '/uploads/maps/evacuation_map.png'),
      etiquette_summary: {
        title: configs.etiquette_title || 'Etika Berkemah di Bedengan',
        description: configs.etiquette_description || 'Jaga kelestarian alam dan hormati sesama penikmat alam.'
      },
      rules,
      warnings,
      etiquette,
      emergency_contacts: emergencyContacts
    };
  },

  // --- RULES & WARNINGS ---
  createRule: async (payload: CreateGuideRuleDTO) => {
    const { type, title, description, icon_name, display_order } = payload;

    if (isEmpty(type) || isEmpty(title)) {
      throw new GuideServiceError('Field type dan title wajib diisi!', 400);
    }

    const typeVal = validateEnum(type, ['rule', 'warning', 'etiquette'], 'Tipe aturan');
    if (!typeVal.isValid) {
      throw new GuideServiceError(typeVal.error || 'Tipe aturan tidak valid.', 400);
    }

    const titleCheck = validateLength(title, 150, 'Judul aturan');
    if (!titleCheck.isValid) throw new GuideServiceError(titleCheck.error || 'Judul aturan terlalu panjang.', 400);

    return GuideModel.createRule({
      type: typeVal.value,
      title: String(title).trim(),
      description: description || '',
      icon_name: icon_name || 'info',
      display_order: parseInt(display_order as string, 10) || 0
    });
  },

  updateRule: async (id: number | string, payload: Partial<CreateGuideRuleDTO>) => {
    const old = await GuideModel.findRuleById(id);
    if (!old) {
      throw new GuideServiceError('Data aturan tidak ditemukan.', 404);
    }

    let type = old.type;
    if (payload.type !== undefined) {
      const typeVal = validateEnum(payload.type, ['rule', 'warning', 'etiquette'], 'Tipe aturan');
      if (!typeVal.isValid) throw new GuideServiceError(typeVal.error || 'Tipe aturan tidak valid.', 400);
      type = typeVal.value;
    }

    let title = old.title;
    if (payload.title !== undefined) {
      if (isEmpty(payload.title)) throw new GuideServiceError('Judul tidak boleh kosong!', 400);
      const titleCheck = validateLength(payload.title, 150, 'Judul aturan');
      if (!titleCheck.isValid) throw new GuideServiceError(titleCheck.error || 'Judul aturan terlalu panjang.', 400);
      title = String(payload.title).trim();
    }

    const description = payload.description !== undefined ? payload.description : old.description;
    const icon_name = payload.icon_name !== undefined ? payload.icon_name : old.icon_name;
    const display_order = payload.display_order !== undefined ? parseInt(payload.display_order as string, 10) || 0 : old.display_order;

    return GuideModel.updateRule(id, {
      type,
      title,
      description,
      icon_name,
      display_order
    });
  },

  deleteRule: async (id: number | string) => {
    const existing = await GuideModel.findRuleById(id);
    if (!existing) {
      throw new GuideServiceError('Data aturan tidak ditemukan.', 404);
    }

    await GuideModel.deleteRule(id);
    return existing;
  },

  // --- EMERGENCY CONTACTS ---
  createContact: async (payload: CreateEmergencyContactDTO) => {
    const { title, phone_number, location_detail, icon_name } = payload;

    if (isEmpty(title) || isEmpty(phone_number)) {
      throw new GuideServiceError('Field title dan phone_number wajib diisi!', 400);
    }

    const titleCheck = validateLength(title, 100, 'Nama instansi/kontak');
    if (!titleCheck.isValid) throw new GuideServiceError(titleCheck.error || 'Nama instansi/kontak terlalu panjang.', 400);

    const phoneVal = validatePhone(phone_number, {
      allowLandline: true,
      fieldName: 'Nomor telepon kontak darurat'
    });
    if (!phoneVal.isValid) {
      throw new GuideServiceError(phoneVal.error || 'Nomor telepon tidak valid.', 400);
    }

    return GuideModel.createContact({
      title: String(title).trim(),
      phone_number: phoneVal.normalized,
      location_detail: location_detail || '',
      icon_name: icon_name || 'phone'
    });
  },

  updateContact: async (id: number | string, payload: Partial<CreateEmergencyContactDTO>) => {
    const old = await GuideModel.findContactById(id);
    if (!old) {
      throw new GuideServiceError('Kontak darurat tidak ditemukan.', 404);
    }

    let title = old.title;
    if (payload.title !== undefined) {
      if (isEmpty(payload.title)) throw new GuideServiceError('Judul kontak tidak boleh kosong!', 400);
      const titleCheck = validateLength(payload.title, 100, 'Nama instansi/kontak');
      if (!titleCheck.isValid) throw new GuideServiceError(titleCheck.error || 'Nama instansi/kontak terlalu panjang.', 400);
      title = String(payload.title).trim();
    }

    let phone_number = old.phone_number;
    if (payload.phone_number !== undefined) {
      const phoneVal = validatePhone(payload.phone_number, {
        allowLandline: true,
        fieldName: 'Nomor telepon kontak darurat'
      });
      if (!phoneVal.isValid) throw new GuideServiceError(phoneVal.error || 'Nomor telepon tidak valid.', 400);
      phone_number = phoneVal.normalized;
    }

    const location_detail = payload.location_detail !== undefined ? payload.location_detail : old.location_detail;
    const icon_name = payload.icon_name !== undefined ? payload.icon_name : old.icon_name;

    return GuideModel.updateContact(id, {
      title,
      phone_number,
      location_detail,
      icon_name
    });
  },

  deleteContact: async (id: number | string) => {
    const existing = await GuideModel.findContactById(id);
    if (!existing) {
      throw new GuideServiceError('Kontak darurat tidak ditemukan.', 404);
    }

    await GuideModel.deleteContact(id);
    return existing;
  }
};

export default guideService;


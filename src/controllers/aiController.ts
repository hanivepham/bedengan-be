import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { successResponse, errorResponse } from '../utils/responseHelper';

/**
 * Controller untuk Integrasi Chatbot Gemini AI Bedengan Xplore
 * Menjawab pertanyaan seputar Bumi Perkemahan Bedengan secara ramah dan informatif
 */
export const aiController = {
  // POST /api/chat
  chat: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return errorResponse(res, 'Pesan pertanyaan tidak boleh kosong!', 400);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || !apiKey.trim()) {
        return errorResponse(res, 'GEMINI_API_KEY belum dikonfigurasi di file .env', 500);
      }

      const genAI = new GoogleGenerativeAI(apiKey.trim());

      const systemInstruction = 'Kamu adalah Asisten Ramah Bumi Perkemahan Bedengan (Bedengan Xplore), Selorejo, Dau, Malang. Tugasmu adalah melayani dan menjawab pertanyaan pengunjung seputar kegiatan berkemah (camping), fasilitas, zona ground (Ground A hingga M), sewa alat/tenda, tiket masuk, keindahan alam, serta kontak darurat dengan ramah, hangat, sopan, dan informatif dalam Bahasa Indonesia.';

      // Utamakan gemini-1.5-flash sesuai instruksi, dengan auto-fallback ke model generasi baru jika versi sebelumnya telah deprecated/404
      const candidateModels = ['gemini-1.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let replyText: string | null = null;
      let selectedModel = 'gemini-1.5-flash';
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction
          });

          const result = await model.generateContent(message.trim());
          const response = await result.response;
          replyText = response.text();
          selectedModel = modelName;
          if (replyText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Chat] Percobaan model '${modelName}' gagal (${err.message}). Mencoba model alternatif...`);
        }
      }

      if (!replyText) {
        throw lastError || new Error('Tidak ada respons yang diterima dari model Gemini.');
      }

      return successResponse(res, 'Respons asisten Bedengan berhasil.', {
        reply: replyText,
        response: replyText,
        source: selectedModel
      });
    } catch (error: any) {
      console.error('[AI Chat Error]', error);
      return errorResponse(res, 'Gagal memproses tanya AI.', 500, error.message);
    }
  }
};

export default aiController;


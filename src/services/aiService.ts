import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const aiService = {
  /**
   * Menjawab pertanyaan pengunjung seputar Bedengan Xplore via Google Gemini AI
   */
  generateChatReply: async (message: string) => {
    if (!message || !message.trim()) {
      throw new AIServiceError('Pesan pertanyaan tidak boleh kosong!', 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      throw new AIServiceError('GEMINI_API_KEY belum dikonfigurasi di file .env', 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey.trim());

    const systemInstruction = 'Kamu adalah Asisten Ramah Bumi Perkemahan Bedengan (Bedengan Xplore), Selorejo, Dau, Malang. Tugasmu adalah melayani dan menjawab pertanyaan pengunjung seputar kegiatan berkemah (camping), fasilitas, zona ground (Ground A hingga M), sewa alat/tenda, tiket masuk, keindahan alam, serta kontak darurat dengan ramah, hangat, sopan, dan informatif dalam Bahasa Indonesia.';

    const candidateModels = ['gemini-1.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let replyText: string | null = null;
    let selectedModel: string = candidateModels[0];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction
        });

        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: message.trim() }]
            }
          ]
        });

        const responseObj = await result.response;
        replyText = responseObj.text();
        selectedModel = modelName;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Chat Warning] Gagal mencoba model ${modelName}:`, err.message);
      }
    }

    if (!replyText) {
      throw new AIServiceError(`Gagal menghubungi layanan Gemini AI: ${lastError ? lastError.message : 'Semua model tidak merespons.'}`, 500);
    }

    return {
      reply: replyText,
      response: replyText,
      source: selectedModel
    };
  }
};

export default aiService;


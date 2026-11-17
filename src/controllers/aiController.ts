import { Request, Response, NextFunction } from 'express';
import aiService from '../services/aiService';
import { successResponse, errorResponse } from '../utils/responseHelper';

/**
 * Controller untuk Integrasi Chatbot Gemini AI Bedengan Xplore (Skinny Controller)
 * Menangani HTTP Request/Response dan mendelegasikan logika ke AIService
 */
export const aiController = {
  // POST /api/chat & /api/ai/chat
  chat: async (req: Request, res: Response, next?: NextFunction) => {
    try {
      const { message } = req.body;
      const result = await aiService.generateChatReply(message);
      return successResponse(res, 'Respons asisten Bedengan berhasil.', result);
    } catch (error: any) {
      console.error('[AI Chat Error]', error);
      const statusCode = error.statusCode || 500;
      return errorResponse(res, error.message || 'Gagal memproses tanya AI.', statusCode);
    }
  }
};

export default aiController;

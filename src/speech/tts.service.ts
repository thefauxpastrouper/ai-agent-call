import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class TTSService {
  async generateAudio(text: string): Promise<Buffer | null> {
    // Validate configuration
    if (!config.elevenLabsKey) {
      logger.error("TTS Error: ELEVENLABS_API_KEY is not set");
      return null;
    }
    
    if (!config.elevenLabsVoiceId) {
      logger.error("TTS Error: ELEVENLABS_VOICE_ID is not set");
      return null;
    }

    if (!text || text.trim().length === 0) {
      logger.warn("TTS Error: Empty text provided");
      return null;
    }

    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`;
      // Using eleven_turbo_v2_5 which is available on free tier and provides fast, high-quality synthesis
      const response = await axios.post(url, {
        text: text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
      }, {
        headers: { 
          'xi-api-key': config.elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      });
      
      logger.info(`TTS Success: Generated audio for text (${text.length} chars)`);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        let errorData = error.response?.data;
        
        // Parse error response if it's a buffer or string
        let errorMessage = '';
        if (errorData) {
          if (Buffer.isBuffer(errorData)) {
            try {
              errorData = JSON.parse(errorData.toString());
            } catch {
              errorData = errorData.toString();
            }
          }
          
          if (typeof errorData === 'object' && errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (errorData.detail.message) {
              errorMessage = errorData.detail.message;
            }
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
        
        logger.error("TTS API Error", {
          status,
          statusText,
          message: error.message,
          apiMessage: errorMessage || undefined,
          errorData: typeof errorData === 'object' ? JSON.stringify(errorData) : errorData,
          url: error.config?.url
        });
        
        // Log specific error messages for common issues
        if (status === 401) {
          if (errorMessage.includes('model_deprecated') || errorMessage.includes('free tier')) {
            logger.error("TTS Error: Model is deprecated or not available on your tier. The model has been updated to eleven_turbo_v2_5");
          } else {
            logger.error("TTS Error: Invalid API key. Please check ELEVENLABS_API_KEY");
          }
        } else if (status === 404) {
          logger.error("TTS Error: Voice ID not found. Please check ELEVENLABS_VOICE_ID");
        } else if (status === 429) {
          logger.error("TTS Error: Rate limit exceeded. Please check your ElevenLabs quota");
        } else if (status === 422) {
          logger.error("TTS Error: Invalid request. Check text content and voice settings");
        }
      } else {
        logger.error("TTS Error: Unexpected error", { error: error instanceof Error ? error.message : String(error) });
      }
      
      return null;
    }
  }
}

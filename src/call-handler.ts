import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AgentService } from './nlp/agent.service';
import { TwilioService } from './integrations/twilio.service';
import { TTSService } from './speech/tts.service';
import { logger } from './utils/logger';

const agent = new AgentService();
const twilioService = new TwilioService();
const tts = new TTSService();

// In-memory storage
const calls: Record<string, any[]> = {};

// Ensure public folder exists automatically
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

export class CallHandler {
  
  public async handleIncomingCall(req: Request, res: Response) {
    const callSid = req.body.CallSid;
    calls[callSid] = []; // Initialize history

    const twiml = twilioService.getVoiceResponse();
    twiml.say("Hello! How can I help you today?"); 
    
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/calls/process',
      speechTimeout: 'auto',
      language: 'en-US'
    });
    
    res.type('text/xml');
    res.send(twiml.toString());
  }

  public async processSpeech(req: Request, res: Response) {
    const callSid = req.body.CallSid;
    const userSpeech = req.body.SpeechResult;
    const host = req.get('host');

    try {
      // 1. Validation
      if (!userSpeech) {
        const twiml = twilioService.getVoiceResponse();
        twiml.say("I didn't hear anything.");
        twiml.redirect('/api/calls/incoming');
        return res.type('text/xml').send(twiml.toString());
      }

      // 2. Defensive History Initialization (The Fix)
      if (!calls[callSid]) {
        calls[callSid] = [];
      }

      // 3. Get AI Response
      const aiResponse = await agent.generateResponse(userSpeech, calls[callSid]);
      
      // 4. Update History
      calls[callSid].push({ role: 'user', content: userSpeech });
      calls[callSid].push({ role: 'assistant', content: aiResponse });

      // 5. Generate Audio (ElevenLabs)
      const audioBuffer = await tts.generateAudio(aiResponse);
      
      const twiml = twilioService.getVoiceResponse();

      if (audioBuffer) {
        // Save file
        const fileName = `${callSid}_${Date.now()}.mp3`;
        const filePath = path.join(publicDir, fileName);
        
        fs.writeFileSync(filePath, audioBuffer);

        // Play file
        // We use https protocol to ensure Twilio can reach it
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const audioUrl = `${protocol}://${host}/audio/${fileName}`;
        
        console.log(`Playing audio: ${audioUrl}`); // Debug log
        twiml.play(audioUrl);
      } else {
        // Fallback if TTS fails
        logger.warn("TTS failed, falling back to Twilio default voice", { callSid, textLength: aiResponse.length });
        twiml.say(aiResponse);
      }

      // Loop back
      twiml.gather({
        input: ['speech'],
        action: '/api/calls/process',
      });
      
      res.type('text/xml');
      res.send(twiml.toString());

    } catch (error) {
      // Catch all errors so server doesn't crash
      console.error("CRITICAL ERROR:", error);
      const twiml = twilioService.getVoiceResponse();
      twiml.say("I am having technical difficulties. Please try again.");
      res.type('text/xml').send(twiml.toString());
    }
  }
}

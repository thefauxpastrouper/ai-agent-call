import twilio from 'twilio';
import { config } from '../config/env';

export class TwilioService {
  private client;

  constructor() {
    this.client = twilio(config.twilio.sid, config.twilio.token);
  }

  getVoiceResponse() {
    return new twilio.twiml.VoiceResponse();
  }
}

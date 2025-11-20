import express from 'express';
import cors from 'cors';
import path from 'path'; // Import path
import { CallHandler } from './call-handler';

const app = express();
const callHandler = new CallHandler();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// EXPOSE PUBLIC FOLDER
// This allows Twilio to access http://your-url/audio/filename.mp3
app.use('/audio', express.static(path.join(__dirname, '../public')));

// Routes
app.post('/api/calls/incoming', (req, res) => callHandler.handleIncomingCall(req, res));
app.post('/api/calls/process', (req, res) => callHandler.processSpeech(req, res));

app.get('/health', (req, res) => res.send('OK'));

export default app;

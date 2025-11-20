import app from './server';
import { config } from './config/env';
import { logger } from './utils/logger';

app.listen(config.port, () => {
  logger.info(`AI Call Agent Server running on port ${config.port}`);
});

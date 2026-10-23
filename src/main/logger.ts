import { app } from 'electron';
import { createLogger, LogLevel } from '../shared/logger';

// Verbose request/URL logging is only useful while developing; packaged
// builds keep INFO and above to avoid console noise.
const currentLevel = app.isPackaged ? LogLevel.INFO : LogLevel.DEBUG;

export const logger = createLogger(currentLevel);

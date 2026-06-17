import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import booksRoutes from './routes/books.routes';
import { logger } from './utils/logger';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(pinoHttp({ logger }));

app.use(booksRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`ShelfSnap Gemini API listening on http://localhost:${PORT}`);
});

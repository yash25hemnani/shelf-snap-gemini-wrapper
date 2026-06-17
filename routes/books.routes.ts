import { Router } from 'express';
import { identifyBooks } from '../controllers/books.controller';

const router = Router();

router.post('/identify-books', identifyBooks);

export default router;

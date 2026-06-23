import { Router } from 'express';
import { getHealth, identifyBooks } from '../controllers/books.controller';
import { verifyFirebaseToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyFirebaseToken);

router.get('/wrapper-health', getHealth);
router.post('/identify-books', identifyBooks);

export default router;

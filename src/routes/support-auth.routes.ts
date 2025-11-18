import { Router } from 'express';
import { supportLogin, getSupportAgentProfile } from '../controllers/support-auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', supportLogin);

router.get('/me', authenticate, getSupportAgentProfile);

export default router;

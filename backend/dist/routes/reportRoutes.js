import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { createReport, getReportById, getReports } from '../controllers/reportController.js';
const reportRouter = Router();
reportRouter.use(requireAuth);
reportRouter.post('/', createReport);
reportRouter.get('/', getReports);
reportRouter.get('/:id', getReportById);
export default reportRouter;

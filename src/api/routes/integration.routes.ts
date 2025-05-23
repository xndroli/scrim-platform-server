// src/api/routes/integration.routes.ts
import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { validate } from '../middleware/validate.middleware';
import { integrationValidators } from '../validators/integration.validators';

const router = Router();
const integrationController = new IntegrationController();

// Discord Integration Routes
router.post('/discord/link', 
  validate(integrationValidators.linkDiscord), 
  (req, res, next) => {
    integrationController.linkDiscordAccount(req, res, next);
  }
);

router.post('/discord/unlink', 
  (req, res, next) => {
    integrationController.unlinkDiscordAccount(req, res, next);
  }
);

// Apex Legends Integration Routes
router.post('/apex/link', 
  validate(integrationValidators.linkApex), 
  (req, res, next) => {
    integrationController.linkApexAccount(req, res, next);
  }
);

router.post('/apex/unlink', 
  (req, res, next) => {
    integrationController.unlinkApexAccount(req, res, next);
  }
);

router.post('/apex/sync', 
  (req, res, next) => {
    integrationController.syncApexStats(req, res, next);
  }
);

router.get('/apex/stats', 
  (req, res, next) => {
    integrationController.getApexStats(req, res, next);
  }
);

// Eligibility Checking Routes
router.get('/team/:teamId/eligibility', 
  (req, res, next) => {
    integrationController.checkTeamEligibility(req, res, next);
  }
);

router.post('/scrim/:scrimId/eligibility', 
  validate(integrationValidators.checkScrimEligibility),
  (req, res, next) => {
    integrationController.checkScrimEligibility(req, res, next);
  }
);

// Integration Status
router.get('/status', 
  (req, res, next) => {
    integrationController.getIntegrationStatus(req, res, next);
  }
);

// Admin Routes
router.post('/apex/bulk-sync', 
  (req, res, next) => {
    integrationController.bulkSyncApexStats(req, res, next);
  }
);

export default router;

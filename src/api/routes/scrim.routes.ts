import { Router } from 'express';
import { ScrimController } from '../controllers/scrim.controller';
import { validate } from '../middleware/validate.middleware';
import { scrimValidators } from '../validators/scrim.validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const scrimController = new ScrimController();

// All routes require authentication
router.use(authMiddleware);

// Scrim routes
router.post(
  '/',
  validate(scrimValidators.createScrim),
  (req, res, next) => {
    scrimController.createScrim(req, res, next)
});

router.get(
  '/',
  (req, res, next) => {
    scrimController.getScrims(req, res, next)
});

router.get(
  '/:scrimId',
  (req, res, next) => {
    scrimController.getScrim(req, res, next)
});

router.patch(
  '/:scrimId',
  validate(scrimValidators.updateScrim),
  (req, res, next) => {
    scrimController.updateScrim(req, res, next)
});

router.post(
  '/:scrimId/join',
  validate(scrimValidators.joinScrim),
  (req, res, next) => {
    scrimController.joinScrim(req, res, next)
});

router.delete(
  '/:scrimId/teams/:teamId',
  (req, res, next) => {
    scrimController.leaveScrim(req, res, next)
});

// Match routes
router.post(
  '/:scrimId/matches',
  validate(scrimValidators.createMatch),
  (req, res, next) => {
    scrimController.createMatch(req, res, next)
});

router.post(
  '/matches/:matchId/results',
  validate(scrimValidators.recordResults),
  (req, res, next) => {
    scrimController.recordMatchResults(req, res, next)
});

export default router;
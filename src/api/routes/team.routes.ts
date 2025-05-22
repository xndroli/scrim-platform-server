import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { validate } from '../middleware/validate.middleware';
import { teamValidators } from '../validators/team.validators';
import { authMiddleware, requireEmailVerification  } from '../middleware/auth.middleware';

const router = Router();
const teamController = new TeamController();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(requireEmailVerification); // Require email verification

// Team routes
router.post('/', validate(teamValidators.createTeam), (req, res, next) => {
  teamController.createTeam(req, res, next);
});

router.get('/', (req, res, next) => {
  teamController.getTeams(req, res, next);
});

router.get('/:teamId', (req, res, next) => {
  teamController.getTeam(req, res, next);
});

router.patch('/:teamId', validate(teamValidators.updateTeam), (req, res, next) => {
  teamController.updateTeam(req, res, next);
});

// Team member routes
router.post('/:teamId/members', validate(teamValidators.addMember), (req, res, next) => {
  teamController.addMember(req, res, next);
});

router.delete('/:teamId/members/:memberId', (req, res, next) => {
  teamController.removeMember(req, res, next);
});

export default router;
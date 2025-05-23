// src/api/routes/webhooks.routes.ts
import { Router } from 'express';
// import { ScrimController } from '../controllers/scrim.controller';
// import { discordBot } from '../../services/discord/bot.service';

const router = Router();
// const scrimController = new ScrimController();

// router.post('/apex/match-end', async (req, res) => {
//   // This would be called by your match tracking system
//   const { scrimId, matchData } = req.body;
  
//   try {
//     // Process match results
//     await scrimController.recordMatchResults(scrimId, matchData));
    
//     // Update Discord
//     // await discordBot.sendScrimNotification(
//     //   scrimId,
//     //   `Match completed! Check the website for detailed results.`
//     // );
    
//     res.status(200).json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to process match results' });
//   }
// });

export default router;

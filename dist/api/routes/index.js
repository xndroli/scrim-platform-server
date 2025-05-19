"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const users_routes_1 = require("./users.routes");
const teams_routes_1 = require("./teams.routes");
const scrims_routes_1 = require("./scrims.routes");
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.authRoutes);
router.use('/users', users_routes_1.usersRoutes);
router.use('/teams', teams_routes_1.teamsRoutes);
router.use('/scrims', scrims_routes_1.scrimsRoutes);
exports.routes = router;
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

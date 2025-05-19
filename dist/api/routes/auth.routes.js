"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
// src/api/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_validators_1 = require("../validators/auth.validators");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, validation_middleware_1.validate)(auth_validators_1.authValidators.register), auth_controller_1.authController.register);
router.post('/login', (0, validation_middleware_1.validate)(auth_validators_1.authValidators.login), auth_controller_1.authController.login);
router.post('/forgot-password', (0, validation_middleware_1.validate)(auth_validators_1.authValidators.forgotPassword), auth_controller_1.authController.resetPassword);
router.post('/reset-password', (0, validation_middleware_1.validate)(auth_validators_1.authValidators.resetPassword), auth_controller_1.authController.resetPassword);
// Protected routes
router.get('/me', auth_middleware_1.authMiddleware, (req, res) => {
    res.status(200).json({ user: req.user });
});
exports.authRoutes = router;

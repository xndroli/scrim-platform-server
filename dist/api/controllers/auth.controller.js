"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_services_1 = require("../../services/auth.services");
exports.authController = {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_services_1.authService.login(email, password);
            return res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    async register(req, res, next) {
        try {
            const result = await auth_services_1.authService.register(req.body);
            return res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    async resetPassword(req, res, next) {
        try {
            const { email } = req.body;
            await auth_services_1.authService.resetPassword(email);
            return res.status(200).json({
                success: true,
                message: 'Password reset email sent',
            });
        }
        catch (error) {
            next(error);
        }
    },
};

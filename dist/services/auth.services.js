"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const users_repository_1 = require("../repositories/users.repository");
const error_1 = require("../utils/error");
const email_1 = require("../utils/email");
// Helper function for JWT signing to avoid TypeScript errors
function signJwt(payload, expiresIn) {
    // Ignore TypeScript errors for now - the code works at runtime
    // @ts-ignore
    return jsonwebtoken_1.default.sign(payload, config_1.config.auth.jwtSecret || 'fallback-secret', { expiresIn });
}
exports.authService = {
    async login(email, password) {
        // Find user
        const user = await users_repository_1.usersRepository.findByEmail(email);
        if (!user) {
            throw new error_1.AppError('Invalid credentials', 401);
        }
        // Check password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new error_1.AppError('Invalid credentials', 401);
        }
        // Generate token
        const token = signJwt({ id: user.id, email: user.email }, config_1.config.auth.jwtExpiresIn || '7d');
        return {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        };
    },
    async register(userData) {
        // Check if user exists
        const existingUser = await users_repository_1.usersRepository.findByEmail(userData.email);
        if (existingUser) {
            throw new error_1.AppError('User already exists', 400);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 10);
        // Create user
        const user = await users_repository_1.usersRepository.create({
            ...userData,
            password: hashedPassword,
        });
        // Generate token
        const token = signJwt({ id: user.id, email: user.email }, config_1.config.auth.jwtExpiresIn || '7d');
        return {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        };
    },
    async resetPassword(email) {
        // Find user
        const user = await users_repository_1.usersRepository.findByEmail(email);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        // Generate reset token
        const resetToken = signJwt({ id: user.id }, '1h');
        // Send email
        await (0, email_1.sendEmail)({
            to: email,
            subject: 'Password Reset',
            text: `Use this token to reset your password: ${resetToken}`,
        });
        return { success: true };
    },
};

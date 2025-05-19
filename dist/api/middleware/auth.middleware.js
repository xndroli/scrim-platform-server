"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const error_1 = require("../../utils/error");
const users_repository_1 = require("../../repositories/users.repository");
// Helper function for JWT verification to avoid TypeScript errors
function verifyJwt(token) {
    // @ts-ignore
    return jsonwebtoken_1.default.verify(token, config_1.config.auth.jwtSecret || 'fallback-secret');
}
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : null;
        if (!token) {
            return next(new error_1.AppError('Not authenticated', 401));
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.auth.jwtSecret);
        // Check if user exists
        const user = await users_repository_1.usersRepository.findById(decoded.id);
        if (!user) {
            return next(new error_1.AppError('User not found', 404));
        }
        // Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        next(new error_1.AppError('Invalid token', 401));
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new error_1.AppError('Not authenticated', 401));
        }
        if (!roles.includes(req.user.role)) {
            return next(new error_1.AppError('Not authorized', 403));
        }
        next();
    };
};
exports.authorize = authorize;
// Export for compatibility with existing code
exports.authMiddleware = exports.authenticate;

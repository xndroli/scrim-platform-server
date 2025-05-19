"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const error_1 = require("../../utils/error");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
const errorMiddleware = (err, req, res, next) => {
    logger_1.logger.error(err.message);
    // Default error
    let statusCode = 500;
    let message = 'Something went wrong';
    let errors = undefined;
    // AppError handling
    if (err instanceof error_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errors = err.errors;
    }
    // Validation error
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Validation error';
        errors = err;
    }
    // JWT error
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    // Send response
    res.status(statusCode).json({
        success: false,
        message,
        errors,
        stack: config_1.config.server.nodeEnv === 'development' ? err.stack : undefined,
    });
};
exports.errorMiddleware = errorMiddleware;

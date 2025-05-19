"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const error_1 = require("../../utils/error");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error.errors) {
                const errorDetails = error.errors.map((err) => ({
                    message: err.message,
                    path: err.path,
                }));
                return next(new error_1.AppError('Validation error', 400, errorDetails));
            }
            next(new error_1.AppError('Validation error', 400));
        }
    };
};
exports.validate = validate;

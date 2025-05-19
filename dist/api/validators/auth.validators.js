"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authValidators = void 0;
const zod_1 = require("zod");
exports.authValidators = {
    register: zod_1.z.object({
        username: zod_1.z.string().min(3).max(30),
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(6),
    }),
    login: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string(),
    }),
    forgotPassword: zod_1.z.object({
        email: zod_1.z.string().email(),
    }),
    resetPassword: zod_1.z.object({
        token: zod_1.z.string(),
        password: zod_1.z.string().min(6),
    }),
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/api/auth.ts
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const drizzle_1 = require("../../db/drizzle");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const ratelimit_1 = __importDefault(require("../../utils/ratelimit"));
const router = express_1.default.Router();
router.post('/login', async (req, res, next) => {
    const { email, passwordHash } = req.body;
    const ip = req.ip || '127.0.0.1';
    const { success } = await ratelimit_1.default.limit(ip);
    if (!success)
        return res.status(429).json({ error: 'Too many requests' });
    try {
        // Check if user exists
        const user = await drizzle_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .limit(1);
        if (user.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isPasswordValid = await (0, bcryptjs_1.compare)(passwordHash, user[0].passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user[0].id, email: user[0].email, name: user[0].username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: {
                id: user[0].id,
                email: user[0].email,
                name: user[0].username
            }
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Login failed' });
    }
});
// Similar endpoints for register, etc.
exports.default = router;

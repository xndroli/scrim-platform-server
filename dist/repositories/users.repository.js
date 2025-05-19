"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRepository = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.usersRepository = {
    async findById(id) {
        const result = await db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, parseInt(id, 10)))
            .limit(1);
        return result[0] || null;
    },
    async findByEmail(email) {
        const result = await db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .limit(1);
        return result[0] || null;
    },
    async create(userData) {
        const result = await db_1.db
            .insert(schema_1.users)
            .values(userData)
            .returning();
        return result[0];
    },
    async update(id, userData) {
        const result = await db_1.db
            .update(schema_1.users)
            .set(userData)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, parseInt(id, 10)))
            .returning();
        return result[0];
    },
    async delete(id) {
        return await db_1.db
            .delete(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, parseInt(id, 10)));
    },
};

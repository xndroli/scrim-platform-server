import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
 	email: text('email').notNull().unique(),
 	emailVerified: boolean('email_verified').notNull().default(true),
 	image: text('image'),
 	createdAt: timestamp('created_at').notNull().defaultNow(),
 	updatedAt: timestamp('updated_at').notNull().defaultNow(),
 	twoFactorEnabled: boolean('two_factor_enabled').default(false),
 	role: text('role').default('user'),
 	banned: boolean('banned').default(false),
 	banReason: text('ban_reason'),
 	banExpires: timestamp('ban_expires')
});

export const session = pgTable("session", {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	expiresAt: timestamp('expires_at').notNull(),
 	token: text('token').notNull().unique(),
 	createdAt: timestamp('created_at').notNull().defaultNow(),
 	updatedAt: timestamp('updated_at').notNull().defaultNow(),
 	ipAddress: text('ip_address'),
 	userAgent: text('user_agent'),
 	userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' }),
 	impersonatedBy: text('impersonated_by')
});

export const account = pgTable("account", {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	accountId: text('account_id').notNull(),
 	providerId: text('provider_id').notNull(),
 	userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' }),
 	accessToken: text('access_token'),
 	refreshToken: text('refresh_token'),
 	idToken: text('id_token'),
 	accessTokenExpiresAt: timestamp('access_token_expires_at'),
 	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
 	scope: text('scope'),
 	password: text('password'),
 	createdAt: timestamp('created_at').notNull().defaultNow(),
 	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verification = pgTable("verification", {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	identifier: text('identifier').notNull(),
 	value: text('value').notNull(),
 	expiresAt: timestamp('expires_at').notNull(),
 	createdAt: timestamp('created_at').defaultNow(),
 	updatedAt: timestamp('updated_at').defaultNow()
});

export const twoFactor = pgTable("two_factor", {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	secret: text('secret').notNull(),
 	backupCodes: text('backup_codes').notNull(),
 	userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' })
});

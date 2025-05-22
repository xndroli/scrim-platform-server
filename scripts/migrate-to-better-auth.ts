import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { 
  user, 
  session, 
  account, 
  verification, 
  twoFactorTable,
  roleTable,
  userRole,
  teams,
  teamMembers,
  scrims,
  scrimParticipants,
  matches,
  matchResults,
  playerMatchStats
} from '../src/db/schema'
import { eq, sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sqlClient = neon(process.env.DATABASE_URL!)
const db = drizzle(sqlClient)

async function clearExistingTables() {
  console.log('🗑️ Clearing existing tables...')
  
  try {
    // Clear existing tables in correct order (foreign key constraints)
    await db.execute(sql`TRUNCATE TABLE player_match_stats CASCADE`)
    await db.execute(sql`TRUNCATE TABLE match_results CASCADE`)
    await db.execute(sql`TRUNCATE TABLE matches CASCADE`)
    await db.execute(sql`TRUNCATE TABLE scrim_participants CASCADE`)
    await db.execute(sql`TRUNCATE TABLE team_members CASCADE`)
    await db.execute(sql`TRUNCATE TABLE scrims CASCADE`)
    await db.execute(sql`TRUNCATE TABLE teams CASCADE`)
    
    // Clear old users table if it exists
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`)
    
    console.log('✅ Existing tables cleared')
  } catch (error) {
    console.log('ℹ️ Some tables may not exist yet, continuing...')
  }
}

async function createBetterAuthTables() {
  console.log('📝 Creating Better-auth tables...')
  
  try {
    // Create Better-auth tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "emailVerified" boolean DEFAULT false NOT NULL,
        "image" text,
        "role" text DEFAULT 'user',
        "profileImage" text,
        "twoFactorEnabled" boolean DEFAULT false,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "token" text NOT NULL UNIQUE,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL,
        "ipAddress" text,
        "userAgent" text,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY NOT NULL,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamp,
        "refreshTokenExpiresAt" timestamp,
        "scope" text,
        "password" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "twoFactor" (
        "id" text PRIMARY KEY NOT NULL,
        "secret" text NOT NULL,
        "backupCodes" text NOT NULL,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "role" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "description" text,
        "permissions" text[],
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "userRole" (
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "roleId" text NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
        "assignedAt" timestamp DEFAULT now() NOT NULL,
        PRIMARY KEY ("userId", "roleId")
      )
    `)

    console.log('✅ Better-auth tables created')
  } catch (error) {
    console.error('❌ Error creating Better-auth tables:', error)
    throw error
  }
}

async function updateExistingTables() {
  console.log('🔄 Updating existing tables for Better-auth compatibility...')
  
  try {
    // Update teams table to use text user IDs
    await db.execute(sql`
      ALTER TABLE teams 
      ALTER COLUMN owner_id TYPE text USING owner_id::text
    `)

    // Update team_members table to use text user IDs
    await db.execute(sql`
      ALTER TABLE team_members 
      ALTER COLUMN user_id TYPE text USING user_id::text
    `)

    // Update scrims table to use text user IDs
    await db.execute(sql`
      ALTER TABLE scrims 
      ALTER COLUMN creator_id TYPE text USING creator_id::text
    `)

    // Update player_match_stats table to use text user IDs
    await db.execute(sql`
      ALTER TABLE player_match_stats 
      ALTER COLUMN user_id TYPE text USING user_id::text
    `)

    // Add foreign key constraints
    await db.execute(sql`
      ALTER TABLE teams 
      ADD CONSTRAINT teams_owner_id_user_id_fk 
      FOREIGN KEY (owner_id) REFERENCES "user"(id)
    `)

    await db.execute(sql`
      ALTER TABLE team_members 
      ADD CONSTRAINT team_members_user_id_user_id_fk 
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
    `)

    await db.execute(sql`
      ALTER TABLE scrims 
      ADD CONSTRAINT scrims_creator_id_user_id_fk 
      FOREIGN KEY (creator_id) REFERENCES "user"(id)
    `)

    await db.execute(sql`
      ALTER TABLE player_match_stats 
      ADD CONSTRAINT player_match_stats_user_id_user_id_fk 
      FOREIGN KEY (user_id) REFERENCES "user"(id)
    `)

    console.log('✅ Existing tables updated')
  } catch (error) {
    console.log('ℹ️ Some constraints may already exist or tables may need different handling')
    console.log('Error details:', error.message)
  }
}

async function seedDefaultRoles() {
  console.log('🌱 Seeding default roles...')
  
  const defaultRoles = [
    {
      id: 'user',
      name: 'User',
      description: 'Standard user with basic access',
      permissions: ['read:profile', 'update:profile', 'join:scrims']
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Administrator with full access',
      permissions: ['*']
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'Moderator with limited admin access',
      permissions: ['read:*', 'moderate:scrims', 'moderate:teams']
    }
  ]

  for (const role of defaultRoles) {
    try {
      await db.execute(sql`
        INSERT INTO "role" (id, name, description, permissions)
        VALUES (${role.id}, ${role.name}, ${role.description}, ${role.permissions})
        ON CONFLICT (id) DO NOTHING
      `)
    } catch (error) {
      console.log(`Role ${role.id} may already exist, skipping...`)
    }
  }

  console.log('✅ Default roles seeded')
}

async function createAdminUser(email: string, name: string) {
  console.log('👨‍💼 Creating admin user...')
  
  try {
    const adminId = crypto.randomUUID()
    
    // Insert admin user
    await db.execute(sql`
      INSERT INTO "user" (id, email, name, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${adminId}, ${email}, ${name}, true, 'admin', NOW(), NOW())
    `)
    
    // Assign admin role
    await db.execute(sql`
      INSERT INTO "userRole" ("userId", "roleId", "assignedAt")
      VALUES (${adminId}, 'admin', NOW())
    `)
    
    console.log(`✅ Admin user created: ${email}`)
    console.log('🔒 Use Better-auth password reset to set password')
    console.log(`📧 Visit: http://localhost:3000/forgot-password`)
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error)
    throw error
  }
}

async function runFullMigration() {
  console.log('🚀 Starting Better-auth migration...')
  
  try {
    await clearExistingTables()
    await createBetterAuthTables()
    await updateExistingTables()
    await seedDefaultRoles()
    
    console.log('✅ Migration completed successfully!')
    console.log('🎉 Better-auth is now ready to use!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Create an admin user: npm run create-admin admin@yourdomain.com "Admin User"')
    console.log('2. Start your server: npm run dev')
    console.log('3. Test registration at: http://localhost:3000/register')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  
  if (args[0] === 'create-admin') {
    const email = args[1]
    const name = args[2]
    
    if (!email || !name) {
      console.error('Usage: npm run create-admin <email> <name>')
      console.error('Example: npm run create-admin admin@yourdomain.com "Admin User"')
      process.exit(1)
    }
    
    await createAdminUser(email, name)
  } else {
    await runFullMigration()
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('🎯 Migration script completed')
      process.exit(0)
    })
    .catch((err) => {
      console.error('💥 Migration script failed:', err)
      process.exit(1)
    })
}

export { runFullMigration, createAdminUser }
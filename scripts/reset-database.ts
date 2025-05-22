// scripts/reset-database.ts - Optional: Complete database reset
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sqlClient = neon(process.env.DATABASE_URL!)
const db = drizzle(sqlClient)

async function resetDatabase() {
  console.log('⚠️  WARNING: This will completely reset your database!')
  console.log('🗑️ Dropping all tables...')
  
  try {
    // Drop all tables
    const tables = [
      'player_match_stats',
      'match_results', 
      'matches',
      'scrim_participants',
      'team_members',
      'scrims',
      'teams',
      'userRole',
      'twoFactor',
      'verification',
      'account',
      'session',
      'role',
      'user',
      'users' // old table
    ]
    
    for (const table of tables) {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`))
    }
    
    console.log('✅ Database reset complete')
    console.log('▶️  Now run: npm run migrate:better-auth')
    
  } catch (error) {
    console.error('❌ Reset failed:', error)
    throw error
  }
}

if (require.main === module) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Reset failed:', err)
      process.exit(1)
    })
}
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const usersRepository = {
  async findById(id: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.user_id, id))
      .limit(1);
      
    return result[0] || null;
  },
  
  async findByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
      
    return result[0] || null;
  },
  
  async create(userData: any) {
    const result = await db
      .insert(users)
      .values(userData)
      .returning();
      
    return result[0];
  },
  
  async update(id: string, userData: any) {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.user_id, id))
      .returning();
      
    return result[0];
  },
  
  async delete(id: string) {
    return await db
      .delete(users)
      .where(eq(users.user_id, id));
  },
};

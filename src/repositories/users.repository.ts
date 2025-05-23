import { db } from '../db';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';

export const usersRepository = {
  async findById(id: string) {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
      
    return result[0] || null;
  },
  
  async findByEmail(email: string) {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
      
    return result[0] || null;
  },
  
  async create(userData: any) {
    const result = await db
      .insert(user)
      .values(userData)
      .returning();
      
    return result[0];
  },
  
  async update(id: string, userData: any) {
    const result = await db
      .update(user)
      .set(userData)
      .where(eq(user.id, id))
      .returning();
      
    return result[0];
  },
  
  async delete(id: string) {
    return await db
      .delete(user)
      .where(eq(user.id, id));
  },
};

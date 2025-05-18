// src/api/auth.ts
import express from 'express';
import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/drizzle';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import ratelimit from '../lib/ratelimit';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const ip = req.ip || '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) return res.status(429).json({ error: 'Too many requests' });
  
  try {
    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
      
    if (user.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await compare(password, user[0].password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user[0].user_id, email: user[0].email, name: user[0].fullName },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    return res.json({ 
      success: true, 
      token,
      user: {
        id: user[0].user_id,
        email: user[0].email,
        name: user[0].fullName
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Similar endpoints for register, etc.

export default router;

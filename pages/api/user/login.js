// pages/api/login.js

import { connectToDatabase } from '../../../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Origin, X-Requested-With, Content-Type, Accept, X-HTTP-Method-Override'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end(); // Respond with 200 status code for preflight requests
    return;
  }

  if (req.method === 'POST') {
    const { email, password } = req.body;

    try {
      const db = connectToDatabase();

      // Find user by email
      const users = await db.collection('users').where('email', '==', email).get();

      if (users.docs.length < 1) {
        return res.status(401).json({ message: 'Invalid Credentials' });
      }

      const user = { id: users.docs[0].id, ...users.docs[0].data() };

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid Credentials' });
      }

      // Generate token with userid instead of _id
      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });

      // Set token in cookie with Path attribute set to '/'
      res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=None`);

      res.status(200).json({ message: 'Login successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}

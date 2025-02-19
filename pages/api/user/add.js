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
    const { name, email, password, role, display_name } = req.body;

    // Check if required fields are empty
    if (!name || !email || !password || !role || !display_name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      // Parse token from request cookies
      const token = req.cookies.token;

      // Parse token from request query to test in postman
      //const token = req.query.token;

      if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify token
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      // Extract user's role
      const userRole = decodedToken.role;

      // Check if the user has the necessary role to add new users
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const db = connectToDatabase();

      // Check if user exists
      const existingUser = await db.collection('users').where('email', '==', email).get();
      const existingUser2 = await db.collection('users').where('display_name', '==', display_name).get();

      if (existingUser.docs.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }
      if (existingUser2.docs.length > 0) {
        return res.status(400).json({ message: 'Display Name already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      await db.collection('users').add({
        name,
        email,
        password: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
        role,
        display_name,
        forget_password_token: null
      });

      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      console.error(error);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      res.status(500).json({ message: 'Server Error' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}

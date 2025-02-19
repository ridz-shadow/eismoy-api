import { connectToDatabase } from '../../../db';
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
    const { categoryName, slug, parent, metaTitle, metaDescription, focusKeyword } = req.body;

    // Check if required fields are empty
    if (!categoryName || !slug || !metaTitle || !metaDescription || !focusKeyword) {
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

      // Check if user role is not admin or editor
      if (decodedToken.role !== 'admin' && decodedToken.role !== 'editor') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const db = connectToDatabase();

      // Check if user exists
      const existingCat = await db.collection('gallery_categories').where('categoryName', '==', categoryName).get();

      if (existingCat.docs.length > 0) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      // Create category
      await db.collection('gallery_categories').add({
        categoryName,
        slug,
        parent: parent || null, // Set parent to null if it's empty
        news_count: 0,
        metaTitle,
        metaDescription,
        focusKeyword
      });

      res.status(201).json({ message: 'Category created successfully' });
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

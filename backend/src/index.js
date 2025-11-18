const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const db = require('./config/desss_db'); 
const authRoutes = require('./routes/authRoutes'); 
const examRoutes = require('./routes/examRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
dotenv.config();
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------
// API ROUTE DEFINITION FIXES
// ------------------------------------------------------------------

// 1. Root route: http://localhost:5000/
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Server is running, but you are not on the API path.' });
});

// 2. THE FIX for "Cannot GET /api": http://localhost:5000/api
// This explicitly handles a GET request to the base /api path.
app.get('/api', (req, res) => {
    res.status(200).json({ message: 'API is running successfully! Access sub-routes like /api/users or /api/auth/login' });
});

// 3. Mount all specific routers under the /api prefix.
// e.g., A route inside authRoutes defined as '/' will be accessible at '/api/auth'
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes);
app.use('/api/slots', require('./routes/slotRoutes'));
app.use('/api/bcc', require('./routes/bccRoutes'));


// 4. Catch-all for undefined /api routes to return a 404 error.
app.use((req, res) => {
    res.status(404).json({ message: `Cannot ${req.method} ${req.url}. Route not found.` });
});

// ------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');  // ← Added

// Import routes
const routes = require('./routes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API Routes
app.use('/api', routes);

// Serve frontend dashboard — FIXED PATH
app.use('/dashboard', express.static(path.join(__dirname, '..', 'frontend', 'src')));

// Redirect root to dashboard
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Crypto Trading Bot is running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/market`);
    console.log(`🖥️  Dashboard: http://localhost:${PORT}/dashboard`);
});
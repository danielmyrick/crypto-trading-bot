// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

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

// Serve frontend
const frontendPath = path.join(__dirname, '..', 'frontend', 'src');
app.use('/dashboard', express.static(frontendPath));
app.use(express.static(frontendPath));

// API Routes
app.use('/api', routes);

// Fallback: Serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Crypto Trading Bot is running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/market`);
    console.log(`🖥️  Dashboard: http://localhost:${PORT}/dashboard`);
});
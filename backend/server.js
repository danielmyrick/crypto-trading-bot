require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const frontendPath = path.join(__dirname, '..', 'frontend', 'src');
app.use('/dashboard', express.static(frontendPath));
app.use(express.static(frontendPath));

app.use('/api', routes);

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Crypto Trading Bot is running on http://localhost:${PORT}`);
});
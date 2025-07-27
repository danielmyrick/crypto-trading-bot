const express = require('express');
const router = express.Router();

const marketController = require('../controllers/marketController');
const tradeController = require('../controllers/tradeController');

router.get('/market', marketController.getMarketData);
router.get('/balance', tradeController.getBalance);
router.post('/buy', tradeController.buy);
router.post('/sell', tradeController.sell);
router.get('/status', tradeController.status);

module.exports = router;
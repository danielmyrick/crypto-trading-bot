module.exports = (sequelize, DataTypes) => {
    const Trade = sequelize.define('Trade', {
        pair: {
            type: DataTypes.STRING,
            allowNull: false
        },
        direction: {
            type: DataTypes.STRING,
            allowNull: false
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        profitLoss: {
            type: DataTypes.FLOAT
        }
    }, {
        tableName: 'trades',
        timestamps: true
    });

    return Trade;
};
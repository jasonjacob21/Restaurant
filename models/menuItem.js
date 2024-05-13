// models/menuItem.js
import { DataTypes } from 'sequelize';
import db from '../config/database.js';

const MenuItem = db.define('menu_item', {
    // Model attributes
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING, // Add the type property
        allowNull: false
    },
    image_source: {
        type: DataTypes.TEXT,
        allowNull: true, // Depending on your requirements
      },
    // Add more properties as needed
});

export default MenuItem; // Export MenuItem as the default export

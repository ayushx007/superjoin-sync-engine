const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * THE DYNAMIC SCHEMA ENGINE
 * * Problem: The assignment says "The table can be of any structure."
 * Solution: We don't hardcode models. We generate them on the fly based on Sheet Headers.
 */

// We use a fixed table name for this assignment context
const TABLE_NAME = 'spreadsheet_data';

const syncSchema = async (headers) => {
  const modelDefinition = {};

  // 1. Sanitize Headers (Remove spaces, special chars)
  // Example: "Phone Number" -> "phone_number"
  headers.forEach((header, index) => {
    const cleanHeader = header.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    
    // 2. Define Columns
    if (cleanHeader === 'id') {
      // Assumption: The first column or a column named 'id' is ALWAYS the Primary Key
      modelDefinition[cleanHeader] = {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      };
    } else {
      // PRO TIP: Why TEXT? 
      // Because "Any Type" in Sheets (Date, Currency, String) is hard to map perfectly.
      // TEXT is the safest bet to prevent data loss during sync.
      modelDefinition[cleanHeader] = {
        type: DataTypes.TEXT,
        allowNull: true
      };
    }
  });

  // 3. Define the Model
  // timestamps: true gives us 'createdAt' and 'updatedAt' automatically (Crucial for Sync)
  const DynamicModel = sequelize.define(TABLE_NAME, modelDefinition, {
    freezeTableName: true,
    timestamps: true 
  });

  // 4. The Magic: { alter: true }
  // This checks the current MySQL table and ADDS missing columns automatically.
  // It handles the "Schema Evolution" requirement.
  await DynamicModel.sync({ alter: true });
  
  console.log(`🔄 Schema synced! Table '${TABLE_NAME}' matches Sheet headers.`);
  return DynamicModel;
};

module.exports = { syncSchema, TABLE_NAME };
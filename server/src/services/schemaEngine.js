const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TABLE_NAME = 'spreadsheet_data';

const syncSchema = async (headers) => {
  const modelDefinition = {};

  // 1. THE GHOST ID (System Column)
  // We force this as the Primary Key. It never changes.
  modelDefinition['superjoin_id'] = {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  };

  // 2. User Columns
  // We map ALL user headers (including the first one) as regular TEXT columns.
  headers.forEach((header) => {
    // Skip if the user somehow named a column 'superjoin_id' to avoid conflict
    if (header === 'superjoin_id') return;

    const cleanHeader = header.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    
    modelDefinition[cleanHeader] = {
      type: DataTypes.TEXT, // Safe for "Any Type"
      allowNull: true
    };
  });

  const DynamicModel = sequelize.define(TABLE_NAME, modelDefinition, {
    freezeTableName: true,
    timestamps: true
  });

  await DynamicModel.sync({ alter: true });
  return DynamicModel;
};

module.exports = { syncSchema, TABLE_NAME };
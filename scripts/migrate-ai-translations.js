// Migration script to add metadata column to AITranslations table
const db = require("../config/db");

async function migrateAITranslations() {
  try {
    console.log("🚀 Starting migration for AITranslations table...");

    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'AITranslations'
      );
    `;
    const tableExists = await db.query(tableExistsQuery);

    if (!tableExists.rows[0].exists) {
      console.log(
        "❌ AITranslations table does not exist. Please run the app first to create it."
      );
      return;
    }

    console.log("✅ AITranslations table exists");

    // Check if metadata column exists
    const columnExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'AITranslations' 
        AND column_name = 'metadata'
      );
    `;
    const columnExists = await db.query(columnExistsQuery);

    if (columnExists.rows[0].exists) {
      console.log("✅ metadata column already exists");
    } else {
      console.log("➕ Adding metadata column...");
      await db.query(
        'ALTER TABLE "AITranslations" ADD COLUMN metadata JSONB NULL;'
      );
      console.log("✅ metadata column added successfully");
    }

    // Check if index exists and create if not
    const indexExistsQuery = `
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'AITranslations' 
        AND indexname = 'idx_ai_translations_metadata'
      );
    `;
    const indexExists = await db.query(indexExistsQuery);

    if (indexExists.rows[0].exists) {
      console.log("✅ metadata index already exists");
    } else {
      console.log("➕ Creating metadata index...");
      await db.query(
        'CREATE INDEX idx_ai_translations_metadata ON "AITranslations" USING GIN (metadata);'
      );
      console.log("✅ metadata index created successfully");
    }

    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'AITranslations' 
      ORDER BY ordinal_position;
    `;
    const columns = await db.query(verifyQuery);

    console.log("📋 Current table schema:");
    columns.rows.forEach((col) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateAITranslations()
    .then(() => {
      console.log("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = migrateAITranslations;

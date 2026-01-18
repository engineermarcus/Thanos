import { MongoClient } from 'mongodb';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// MongoDB Atlas connection string
const uri = process.env.MONGO_URI;

// Check if URI is loaded
if (!uri) {
  console.error("ERROR: MONGO_URI is not defined in your .env file");
  process.exit(1);
}

async function deleteEverything() {
  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB Atlas
    await client.connect();
    console.log("Connected to MongoDB Atlas\n");

    // Get admin database to list all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    console.log("=== DATABASES TO BE CLEANED ===");
    
    // Iterate through each database
    for (const dbInfo of databases) {
      // Skip system databases
      if (['admin', 'local', 'config'].includes(dbInfo.name)) {
        console.log(`- ${dbInfo.name} (skipped - system database)`);
        continue;
      }

      console.log(`- ${dbInfo.name}`);
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      // Delete all documents from each collection
      for (const collInfo of collections) {
        const collection = db.collection(collInfo.name);
        const result = await collection.deleteMany({});
        console.log(`  ✓ Deleted ${result.deletedCount} documents from ${collInfo.name}`);
      }
    }

    console.log("\n✓ All data deleted successfully!");

  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  } finally {
    // Close the connection
    await client.close();
    console.log("\nConnection closed");
  }
}

// WARNING: This will delete ALL data!
console.log("⚠️  WARNING: This will delete ALL data from your MongoDB Atlas!");
console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n");

setTimeout(() => {
  deleteEverything();
}, 5000);















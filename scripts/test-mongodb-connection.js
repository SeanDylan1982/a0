const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.DATABASE_URL;

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('Connection string:', uri ? 'Found' : 'Not found');
  
  if (!uri) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test listing databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();

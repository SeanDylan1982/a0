import { connectToDatabase } from '@/lib/db-manager';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  const isConnected = await connectToDatabase();
  
  if (isConnected) {
    console.log('✅ Successfully connected to MongoDB!');
    process.exit(0);
  } else {
    console.error('❌ Failed to connect to MongoDB');
    process.exit(1);
  }
}

testConnection().catch(console.error);

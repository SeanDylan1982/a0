import { connectToDatabase, db } from '../src/lib/db'

async function testConnection() {
  console.log('Testing MongoDB Atlas connection...')
  
  const connected = await connectToDatabase()
  
  if (connected) {
    try {
      // Test a simple query
      const userCount = await db.user.count()
      console.log(`✅ Connection successful! Found ${userCount} users in database.`)
    } catch (error) {
      console.log('✅ Connection successful! Database is ready (no users yet).')
    }
  } else {
    console.log('❌ Connection failed!')
    process.exit(1)
  }
  
  process.exit(0)
}

testConnection()
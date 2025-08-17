// Test the dashboard API directly without going through HTTP
const { NextRequest, NextResponse } = require('next/server')

// Mock the dashboard API function
async function testDashboardDirect() {
  try {
    // Import the dashboard API
    const { GET } = require('./src/app/api/dashboard/route.ts')
    
    // Create a mock request
    const mockRequest = new NextRequest('http://localhost:3500/api/dashboard')
    
    // Call the API function directly
    const response = await GET(mockRequest)
    const data = await response.json()
    
    console.log('Dashboard API Response:')
    console.log(JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('Error testing dashboard API:', error)
  }
}

testDashboardDirect()
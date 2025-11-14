#!/usr/bin/env node

/**
 * Test script to demonstrate environment loading priority
 * Run with: node scripts/test-env.js
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

console.log('🧪 Testing Environment Loading Priority\n');

// Check which files exist
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

console.log('📁 Checking environment files:');
console.log(`   .env.local: ${fs.existsSync(envLocalPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
console.log(`   .env: ${fs.existsSync(envPath) ? '✅ EXISTS' : '❌ NOT FOUND'}\n`);

// Simulate the loading process
console.log('🔄 Loading environment variables...\n');

try {
  // Priority 1: Load .env.local if it exists
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('📁 Environment loaded from .env.local');
  }

  // Priority 2: Load .env as fallback
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('📁 Environment loaded from .env');
  }

  // Check if any environment files were loaded
  if (!fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) {
    console.log('⚠️  No environment files found (.env.local or .env)');
    console.log('💡 Create .env.local for local development or .env for shared configuration');
  } else {
    console.log('\n✅ Environment files loaded successfully!');
  }

  // Display loaded variables
  console.log('\n📋 Loaded Environment Variables:');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('   PORT:', process.env.PORT || '3000');
  console.log('   DATABASE_HOST:', process.env.DATABASE_HOST ? '✅ SET' : '❌ NOT SET');
  console.log('   DATABASE_PORT:', process.env.DATABASE_PORT || '❌ NOT SET');
  console.log('   DATABASE_NAME:', process.env.DATABASE_NAME ? '✅ SET' : '❌ NOT SET');
  console.log('   DATABASE_USER:', process.env.DATABASE_USER ? '✅ SET' : '❌ NOT SET');
  console.log('   DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '✅ SET' : '❌ NOT SET');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');

} catch (error) {
  console.error('❌ Error loading environment files:', error.message);
}

console.log('\n💡 Tip: Create .env.local for local development overrides');
console.log('   Variables in .env.local will override those in .env');

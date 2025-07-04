// Load environment variables
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcryptjs');

console.log('🔐 Testing Authentication Configuration');
console.log('====================================');

// Test password and hash - Change these to your credentials
const password = 'your_password_here';
const username = 'your_username_here';

// Hash from environment
const envHash = process.env.USER_PASSWORD_HASH;

console.log('Username:', username);
console.log('Password:', password);
console.log('Environment Hash:', envHash);

if (envHash) {
    console.log('\n🧪 Testing password verification...');
    
    try {
        const isMatch = bcrypt.compareSync(password, envHash);
        
        if (isMatch) {
            console.log('✅ Password verification: SUCCESS');
            console.log('✅ Authentication should work correctly');
        } else {
            console.log('❌ Password verification: FAILED');
            console.log('❌ Hash does not match password');
            
            // Generate new hash
            console.log('\n🔧 Generating new hash...');
            const newHash = bcrypt.hashSync(password, 10);
            console.log('New hash:', newHash);
            console.log('\n📝 Update your .env.local with:');
            console.log(`USER_PASSWORD_HASH=${newHash}`);
        }
    } catch (error) {
        console.log('❌ Error during verification:', error.message);
    }
} else {
    console.log('❌ No password hash found in environment');
    console.log('\n🔧 Generating hash for password...');
    const newHash = bcrypt.hashSync(password, 10);
    console.log('Generated hash:', newHash);
    console.log('\n📝 Add to your .env.local:');
    console.log(`USER_PASSWORD_HASH=${newHash}`);
}

console.log('\n🌐 Current Environment:');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
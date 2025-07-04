const bcrypt = require('bcryptjs');

// Change this to your desired password
const password = 'your_password_here';
const hash = bcrypt.hashSync(password, 10);
console.log('Password hash:', hash);
console.log('Base64 encoded hash:', Buffer.from(hash).toString('base64'));
// Copy the base64 encoded hash to USER_PASSWORD_HASH_B64 in .env.local
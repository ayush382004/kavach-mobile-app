require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MONGODB_HOSTPORT:', process.env.MONGODB_HOSTPORT);
console.log('MONGODB_USERNAME:', process.env.MONGODB_USERNAME);
console.log('MONGODB_PASSWORD:', process.env.MONGODB_PASSWORD ? '****' : 'not set');

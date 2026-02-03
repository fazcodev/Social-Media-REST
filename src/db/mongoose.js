const dns = require('node:dns/promises');
const mongoose = require('mongoose');

dns.setServers(['1.1.1.1']);
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URL);

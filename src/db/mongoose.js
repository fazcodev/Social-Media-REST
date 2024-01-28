const mongoose = require('mongoose');
mongoose.set('strictQuery', true);

mongoose.connect(process.env.MONGODB_URL_DEV, {
  useNewUrlParser: true,
});

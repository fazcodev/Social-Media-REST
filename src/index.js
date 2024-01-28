const express = require('express');
require('./db/mongoose');
const cors = require('cors');
const UserRouter = require('./routers/user');
const PostRouter = require('./routers/post');
const FeedRouter = require('./routers/feeds');
const ExploreRouter = require('./routers/explore');
const app = express();
const PORT = process.env.PORT;
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use('/api', UserRouter);
app.use('/api', PostRouter);
app.use('/api', FeedRouter);
app.use('/api', ExploreRouter);
app.get('*', (req, res) => {
  res.status(200).send('I am alive');
});
app.listen(PORT, () => {
  console.log(`App Listening at http://localhost:${PORT}`);
});

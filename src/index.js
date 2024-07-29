const express = require('express');
const cookieParser = require('cookie-parser');
require('./db/mongoose');
const cors = require('cors');
const UserRouter = require('./routers/user');
const PostRouter = require('./routers/post');
const FeedRouter = require('./routers/feeds');
const ExploreRouter = require('./routers/explore');
const app = express();
const PORT = process.env.PORT;
// const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  // origin: 'http://localhost:5000',
  origin: 'https://social-media-frontend-green.vercel.app',
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

app.use(cors(corsOptions));

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

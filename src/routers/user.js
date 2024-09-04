const express = require('express');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const router = new express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const uploadImage = require('../middleware/uploadImage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});
router.get('/users', (req, res) => {
  res.status(200).json({ message: 'User Router' });
});
router.post('/users', async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // set to false if testing locally over HTTP
      sameSite: 'None', // use 'Lax' or 'Strict' for local testing without HTTPS
      maxAge: 3 * 60 * 60 * 1000, // 24 hours
    });
    // res.status(201).json({ user, token });
    res.status(201).json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/users/oauth-login', async (req, res) => {
  let user = await User.findOne({ username: req.body.user.username });
  if (!user) {
    user = new User(req.body.user);
    await user.save();
  } else {
    user = await User.findOne({
      username: req.body.user.username,
      email: req.body.user.email,
      OAuth: req.body.OAuth,
    });
    if (!user) {
      user = new User({
        username: `${req.body.user.username}1`,
        ...req.body.user,
      });
      await user.save();
    }
  }

  try {
    const token = await user.saveOAuthToken(req.body.token, req.body.OAuth);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // set to false if testing locally over HTTP
      sameSite: 'None', // use 'Lax' or 'Strict' for local testing without HTTPS
      maxAge: 3 * 60 * 60 * 1000,
    });
    res.cookie('isOAuth', true, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 3 * 60 * 60 * 1000,
    });
    res.status(201).json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.username,
      req.body.password
    );
    const token = await user.generateAuthToken();
    //  send a token as cookie

    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // set to false if testing locally over HTTP
      sameSite: 'None', // use 'Lax' or 'Strict' for local testing without HTTPS
      maxAge: 3 * 60 * 60 * 1000,
    });
    // res.status(201).json({ user, token });
    res.status(201).json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/users/me', auth, async (req, res) => {
  if (req.user.avatarKey) {
    req.user.avatarURL = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: req.user.avatarKey,
      }),
      // expires after 1 week
      { expiresIn: 60 * 60 * 24 } // 10 years
    );
    await req.user.save();
  }
  res.json(req.user);
});

router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedupdates = ['name', 'username', 'email', 'age', 'bio'];
  const isValidOperation = updates.every((update) =>
    allowedupdates.includes(update)
  );
  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates!' });
  }
  try {
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();
    res.json(req.user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post(
  '/users/me/avatar',
  auth,
  uploadImage.single('image'),
  async (req, res) => {
    try {
      const user = req.user;
      // store the url of the image in the database
      if (user.avatarKey) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: user.avatarKey,
          })
        );
      }

      user.avatarKey = req.file.key;
      user.avatarURL = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: user.avatarKey,
        }),
        // expires after 1 week
        { expiresIn: 60 * 60 * 24 * 7 } // 10 years
      );
      await user.save();
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);
router.get('/users/me/user-suggestions', auth, async (req, res) => {
  try {
    await req.user.populate({ path: 'followings' });
    const followedUsers = await req.user.followings;
    const followedUserIds = followedUsers.map((user) => user.following);
    let suggestedUsers = await Follow.aggregate([
      {
        $match: {
          follower: { $in: followedUserIds },
          following: { $nin: followedUserIds.concat(req.user._id) },
        },
      },
      {
        $group: {
          _id: '$following',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
    if (suggestedUsers.length === 0) {
      suggestedUsers = await User.find({
        _id: { $nin: followedUserIds.concat(req.user._id) },
      });
    }
    const suggestedUserIds = suggestedUsers.map((user) => user._id);
    const users = await User.find({ _id: { $in: suggestedUserIds } });
    const sortedSuggestedUsers = suggestedUserIds.map((id) =>
      users.find((user) => user._id.equals(id))
    );
    res.status(200).json(sortedSuggestedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/users/search', async (req, res) => {
  try {
    const searchQuery = req.query.q; // Get the search query from the request query string
    const skip = parseInt(req.query.skip) || 0; // Get the page number from the query or default to 1
    const limit = parseInt(req.query.limit) || 10; // Get the search query from the request query string
    if (!searchQuery) return;
    const query = {
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive username search
        { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive name search
      ],
    };

    const users = await User.find(query).skip(skip).limit(limit);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.patch('/users/me/change-password', auth, async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.user.username,
      req.body.oldPassword
    );
    user.password = req.body.newPassword;
    await user.save();
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
router.get('/users/me/liked', auth, async (req, res) => {
  try {
    await req.user.populate({ path: 'liked' });
    res.json(req.user.liked);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // also ppulate the posts of the user
    await user.populate({ path: 'posts' });
    res.status(200).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/users/:username/followers', async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ username });
    await user.populate({ path: 'followers' });
    const followers = user.followers;
    res.status(200).json(followers);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/users/:username/followings', async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ username });
    await user.populate({ path: 'followings' });
    const followings = user.followings;
    res.status(200).json(followings);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/users/:username/follow', auth, async (req, res) => {
  const username = req.params.username;
  try {
    const follow = await req.user.follow(username);
    res.status(200).json({ user: req.user, follow });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/users/:username/unfollow', auth, async (req, res) => {
  const username = req.params.username;
  try {
    const follow = await req.user.unfollow(username);
    res.status(200).json({ user: req.user, follow });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    let cookieToken;
    if (req.cookies.isOAuth) {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      cookieToken = decoded.token;
    } else {
      cookieToken = req.cookies.token;
    }
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== cookieToken;
    });
    await req.user.save();
    res.cookie('token', '', {
      httpOnly: true,
      secure: true,
      expires: new Date(0), // Set the cookie's expiry date to the past
    });
    res.cookie('isOAuth', '', {
      httpOnly: true,
      secure: true,
      expires: new Date(0), // Set the cookie's expiry date to the past
    });

    res.json({ message: 'Logout successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/users/logoutall', auth, async (req, res) => {
  try {
    req.user.tokens = [];

    await req.user.save();
    res.cookie('token', '', {
      httpOnly: true,
      secure: true,
      expires: new Date(0), // Set the cookie's expiry date to the past
    });
    res.cookie('isOAuth', '', {
      httpOnly: true,
      secure: true,
      expires: new Date(0), // Set the cookie's expiry date to the past
    });
    res.json({ message: 'Logout successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove();
    res.json(req.user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
module.exports = router;

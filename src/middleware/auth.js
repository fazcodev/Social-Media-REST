const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // const token = req.header('Authorization').replace('Bearer ', '');
    const token = req.cookies.token;
    // console.log(token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = req.cookies.isOAuth
      ? await User.findOne({ _id: decoded._id, 'tokens.token': decoded.token })
      : await User.findOne({ _id: decoded._id, 'tokens.token': token });

    if (!user) {
      throw new Error();
    }
    // req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please Authenticate.' });
  }
};
module.exports = auth;

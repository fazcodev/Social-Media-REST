const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const Post = require('./Post');
const Follow = require('./Follow');
const Like = require('./Like');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Email is invalid');
        }
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 7,
      trim: true,
      validate(value) {
        if (value.toLowerCase().includes('password')) {
          throw new Error("Password cannot contain 'password'");
        }
      },
    },
    age: {
      type: Number,
      default: 0,
      validate(value) {
        if (value < 0) {
          throw new Error('Age must be a positive number');
        }
      },
    },
    bio: {
      type: String,
      trim: true,
    },
    tokens: {
      type: [
        {
          token: {
            type: String,
            required: true,
          },
        },
      ],
      validate(value) {
        if (value.length > 5) {
          throw new Error(
            'You have exceeded the maximum number of sessions allowed. Please log out of one of your other devices and try again.'
          );
        }
      },
    },
    avatarKey: {
      type: String,
    },
    avatarURL: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'owner',
});

userSchema.virtual('followings', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'follower',
});

userSchema.virtual('followers', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'following',
});

userSchema.virtual('liked', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('commented', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('saved', {
  ref: 'Saved',
  localField: '_id',
  foreignField: 'user',
});

userSchema.methods.toJSON = function () {
  const user = this;
  userObject = user.toObject();
  delete userObject.password;
  delete userObject.tokens;
  return userObject;
};

userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

userSchema.statics.findByCredentials = async (username, password) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error('No user found');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Password is incorrect');
  }
  return user;
};
userSchema.methods.follow = async function (username) {
  const owner = this;
  if (owner.username === username) throw new Error('Bad request'); // can't follow self
  const user = await User.findOne({ username });
  if (!user) throw new Error('No user found');
  const exist = await Follow.findOne({
    follower: owner._id,
    following: user._id,
  });
  if (exist) throw new Error('Already following');
  const follow = new Follow({ follower: owner._id, following: user._id });
  await follow.save();
  return follow;
};
userSchema.methods.unfollow = async function (username) {
  const owner = this;
  if (owner.username === username) throw new Error('Bad request');
  const user = await User.findOne({ username });
  if (!user) throw new Error('No user found');
  const follow = await Follow.findOne({
    follower: owner._id,
    following: user._id,
  });
  if (!follow) throw new Error('No follow found');
  await Follow.findOneAndDelete({ _id: follow._id });
  return follow;
};
userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});
// delete user posts when user is removed
userSchema.pre('remove', async function (next) {
  const user = this;
  await Post.deleteMany({ owner: user._id });
  await Like.deleteMany({ user: user._id });
  await Comment.deleteMany({ user: user._id });
  // remove user from Follow
  await Follow.deleteMany({ follower: user._id });
  await Follow.deleteMany({ following: user._id });
  next();
});
const User = mongoose.model('User', userSchema);

module.exports = User;

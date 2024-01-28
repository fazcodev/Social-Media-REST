const mongoose = require('mongoose');
const savedSchema = mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Post',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
});

savedSchema.index({ user: 1, post: 1 }, { unique: true });

const Saved = mongoose.model('Saved', savedSchema);

module.exports = Saved;

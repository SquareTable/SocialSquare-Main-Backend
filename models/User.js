const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    secondId: String,
    name: String,
    displayName: String,
    email: String,
    password: String,
    badges: Array,
    followers: Array,
    following: Array,
    totalLikes: 0,
    status: String,
    profileImageKey: String,
    notificationKeys: Array
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
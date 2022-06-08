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
    notificationKeys: Array,
    bio: String,
    privateAccount: {type: Boolean, default: false},
    accountFollowRequests: Array,
    blockedAccounts: Array,
    algorithmEnabled: {type: Boolean, default: false},
    authenticationFactorsEnabled: {type: Array, default: []}
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
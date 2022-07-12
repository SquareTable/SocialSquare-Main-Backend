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
    authenticationFactorsEnabled: {type: Array, default: []},
    MFAEmail: String,
    settings: {type: Object, default: {
        notificationSettings: {
            TextMessages: true,
            GainsFollower: true,
            FollowRequests: true,
            UpvotesOnMultimediaPosts: true,
            NeutralVotesOnMultimediaPosts: true,
            DownvotesOnMultimediaPosts: true,
            UpvotesOnVideos: true,
            NeutralVotesOnVideos: true,
            DownvotesOnVideos: true,
            UpvotesOnPolls: true,
            NeutralVotesOnPolls: true,
            DownvotesOnPolls: true,
            UpvotesOnThreads: true,
            NeutralVotesOnThreads: true,
            DownvotesOnThreads: true,
            PersonJoiningCategory: true,
            SendTextMessages: true,
            SendGainsFollower: true,
            SendFollowRequests: true,
            SendUpvotesOnMultimediaPosts: true,
            SendNeutralVotesOnMultimediaPosts: true,
            SendDownvotesOnMultimediaPosts: true,
            SendUpvotesOnVideos: true,
            SendNeutralVotesOnVideos: true,
            SendDownvotesOnVideos: true,
            SendUpvotesOnPolls: true,
            SendNeutralVotesOnPolls: true,
            SendDownvotesOnPolls: true,
            SendUpvotesOnThreads: true,
            SendNeutralVotesOnThreads: true,
            SendDownvotesOnThreads: true,
            SendJoiningCategory: true
        },
        algorithmSettings: {
            enabled: false
        }
    }}
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
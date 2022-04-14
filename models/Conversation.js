const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
    members: Array,
    isDirectMessage: Boolean,
    ownerId: String,
    conversationImageKey: String,
    conversationTitle: String,
    conversationDescription: String,
    conversationNSFW: Boolean,
    conversationNSFL: Boolean,
    dateCreated: String,
    lastMessage: String,
    lastMessageDate: String,
    isEncrypted: Boolean,
    publicEncryptionKeys: Array,
    cryptographicNonce: Array,
    allowScreenShots: Boolean,
    lastMessageViewed: Array
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
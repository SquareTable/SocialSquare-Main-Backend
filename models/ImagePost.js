const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    imageKey: String,
    imageTitle: String, 
    imageDescription: String,
    imageUpVotes: Array,
    imageDownVotes: Array,
    imageCreatorId: mongoose.Schema.Types.ObjectId,
    imageComments: Array,
    datePosted: String,
    allowScreenShots: Boolean,
    viewedBy: Array
});

const ImagePost = mongoose.model('ImagePost', ImageSchema);

module.exports = ImagePost;
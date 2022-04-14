const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PollSchema = new Schema({
    pollTitle: String, 
    pollSubTitle: String,
    optionOne: String,
    optionOnesColor: String,
    optionOnesVotes: Array,
    optionTwo: String,
    optionTwosColor: String,
    optionTwosVotes: Array,
    optionThree: String,
    optionThreesColor: String,
    optionThreesVotes: Array,
    optionFour: String,
    optionFoursColor: String,
    optionFoursVotes: Array,
    optionFive: String,
    optionFivesColor: String,
    optionFivesVotes: Array,
    optionSix: String,
    optionSixesColor: String,
    optionSixesVotes: Array,
    totalNumberOfOptions: String,
    pollUpVotes: Array,
    pollDownVotes: Array,
    pollCreatorId: mongoose.Schema.Types.ObjectId,
    pollComments: Array,
    datePosted: String,
    allowScreenShots: Boolean,
    viewedBy: Array
});

const Poll = mongoose.model('Poll', PollSchema);

module.exports = Poll;
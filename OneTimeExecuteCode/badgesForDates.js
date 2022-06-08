/*
const mongodb = require('mongodb');

const { generateTwoDigitDate } = require('./../generateTwoDigitDate')

//Schemas
const User = require('./../models/User');
const Poll = require('./../models/Poll');
const ImagePost = require('./../models/ImagePost');
const Category = require('./../models/Category');
const Thread = require('./../models/Thread')

function badgesForDates() {
    const twoDigitDate = generateTwoDigitDate()
    console.log(twoDigitDate)
    User.find({}).then(usersFound => {
        if (usersFound.length) {
            usersFound.forEach(function(item, index) {
                const thisUsersBadges = usersFound[index].badges
                let thisUsersBadgesNamesWithDates = []
                thisUsersBadges.forEach(function(item, index) {
                    thisUsersBadgesNamesWithDates.push({badgeName: thisUsersBadges[index], dateRecieved: twoDigitDate})
                })
                User.findOneAndUpdate({_id: usersFound[index]._id}, {badges: thisUsersBadgesNamesWithDates}).then(function() {
                    console.log(`Badge updated for ${usersFound[index]._id} / ${usersFound[index].name}.`)
                })
            })
        } else {
            console.log("No users?")
        }
    }).catch(err => {
        console.log("Oopsies")
        console.log(err)
    })
}

exports.badgesForDates = badgesForDates
*/
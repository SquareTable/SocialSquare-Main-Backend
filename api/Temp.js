const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const mongodb = require('mongodb');
mongoose.set('useFindAndModify', false);
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();
const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

const { generateTwoDigitDate } = require('./../generateTwoDigitDate')

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new S3 ({
    region,
    accessKeyId,
    secretAccessKey
})

const util = require('util')
const unlinkFile = util.promisify(fs.unlink)

//Image post
const multer  = require('multer')
const path = require('path');
const stream = require('stream')

const DIR = `.${process.env.UPLOAD_PATH}` 
const storage = multer.diskStorage({
    // Destination to store image     
    destination: (req, file, cb) => {
        cb(null, DIR)
    },
    filename: (req, file, cb) => {
        let extName = path.extname(file.originalname)
        if (extName == ".png" || extName == ".jpg" || extName == ".jpeg") {
            var newUUID = uuidv4(); 
            cb(null, newUUID + extName); 
        } else {
            cb("Invalid file format")
        }      
    }
});

const upload = multer({ storage: storage })

const { uploadFile, getFileStream } = require('../s3')

const jwt = require('jsonwebtoken')

// mongodb user model
const User = require('./../models/User');
const Poll = require('./../models/Poll');
const ImagePost = require('./../models/ImagePost');
const Category = require('./../models/Category');
const Thread = require('./../models/Thread')
const Message = require('./../models/Message')

// Password handler
const bcrypt = require('bcrypt');

const { setCacheItem } = require('../memoryCache.js')

// Use axios to make HTTP GET requests to random.org to get random base-16 strings for account verification codes
const axios = require('axios')

// Use .env file for email configuration
require('dotenv').config();

const { blurEmailFunction, mailTransporter } = require('../globalFunctions.js')


//Web Token Stuff

const { tokenValidation } = require("../middleware/TokenHandler");

router.all("*", [tokenValidation]); // the * just makes it that it affects them all it could be /whatever and it would affect that only

//Notification stuff

const { sendNotifications } = require("../notificationHandler")


//Add Notification Device Key
router.post('/sendnotificationkey', (req, res) => {
    let {idSent, keySent} = req.body;
    console.log("Notif - idSent: " + idSent)
    console.log("Notif - keySent: " + keySent)
    //main
    User.find({_id: idSent}).then(userData => {
        if (userData.length) {
            const notificationKeys = userData[0].notificationKeys;
            if (notificationKeys.includes(keySent)) {
                res.json({
                    status: "FAILED",
                    message: "Notification key already exists in account data"
                })
            } else if (keySent == null) {
                res.json({
                    status: "FAILED",
                    message: "Notification key cannot be null"
                })
            } else {
                User.findOneAndUpdate({_id: idSent}, {$push : {notificationKeys: keySent}}).then(function() {
                    res.json({
                        status: "SUCCESS",
                        message: "Notification Key Saved."
                    })
                }).catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "Error saving notification key."
                    })
                })
            }
        } else {
            res.json({
                status: "FAILED",
                message: "Couldn't find user while sending device notification key."
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error finding user while sending device notification key."
        })
    })
})

//ChangeDisplayName
router.post('/changedisplayname', (req, res) => {
    let {desiredDisplayName, userID} = req.body;
    desiredDisplayName = desiredDisplayName.trim();

    if (!desiredDisplayName) {
        res.json({
            status: "FAILED",
            message: "Empty display name supplied!"
        });
    } else {
        // Check if user exist
        User.find({ _id: userID })
        .then((data) => {
            if (data.length) {
                //User Exists
                User.findOneAndUpdate({_id: userID}, {displayName: desiredDisplayName}).then(function() {
                    res.json({
                        status: "SUCCESS",
                        message: "Display name changed successfully."
                    })
                }).catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "Error updating display name."
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "User not found!"
                })
            }
        }).catch(err => {
            res.json({
                status: "FAILED",
                message: " An error occured while checking for existing user"
            })
        })
    }
})

//ChangeEmail
router.post('/changeemail', (req, res) => {
    let {password, userEmail, desiredEmail} = req.body;
    password = password.trim();
    desiredEmail = desiredEmail.trim();
    if (password == "" || userEmail == "" || desiredEmail == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        });
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(desiredEmail)) {
        res.json({
            status: "FAILED",
            message: "Invalid desired email entered"
        })
    } else {
        // Check if user exist
        User.find({ email: userEmail })
        .then((data) => {
            if (data.length) {
                //User Exists
                User.find({ email: desiredEmail }).then(result => {
                    // A email exists
                    if (result.length) {
                        res.json({
                            status: "FAILED",
                            message: "User with the desired email already exists"
                        })  
                    } else {
                        const hashedPassword = data[0].password;
                        bcrypt.compare(password, hashedPassword).then((result) => {
                                if (result) {
                                    // Password match
                                    User.findOneAndUpdate({email: userEmail}, {email: desiredEmail}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Change Email Successful",
                                            data: data
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "An error occured while checking for existing user"
                                        })
                                    });
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "Invalid password entered!"
                                    })
                                }
                            })
                            .catch(err => {
                                res.json({
                                    status: "FAILED",
                                    message: "An error occured while comparing passwords!"
                                })
                            })
                        }
                    })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid credentials entered!"
                })
            }
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: " An error occured while checking for existing user"
            })
        })                                              
    }
})

//ChangePassword
router.post('/changepassword', (req, res) => {
    let {currentPassword, newPassword, confirmNewPassword, userId} = req.body;
    currentPassword = currentPassword.trim()
    newPassword = newPassword.trim()
    confirmNewPassword = confirmNewPassword.trim()

    if (currentPassword == "" || newPassword == "" || confirmNewPassword == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        })
    } else {
        //Check if the user exists
        User.find({_id: userId})
        .then((data) => {
            if (data.length) {
                //User Exists
                const hashedPassword = data[0].password;
                bcrypt.compare(currentPassword, hashedPassword).then((result) => {
                    if (result) {
                        //Password match
                        if (newPassword === confirmNewPassword) {
                            //Password and Confirm Password are the same\
                            if (newPassword.length < 8) {
                                res.json({
                                    status: "FAILED",
                                    message: "Your password must be longer than 8 characters"
                                })
                            } else {
                                //Password is suitable to be changed
                                // password handling
                                const saltRounds = 10;
                                bcrypt.hash(newPassword, saltRounds).then((hashedPassword) => {
                                    User.findOneAndUpdate({_id: userId}, {password: hashedPassword}).then(function(){
                                        //Everything worked
                                        console.log('Changing user password was a success!')
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Changing password was a success!"
                                        })
                                    }).catch((error) => {
                                        console.log('Error while updating user')
                                        console.log(error)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error occured while updating user"
                                        })
                                    })
                                }).catch((error) => {
                                    console.log('Error hashing password')
                                    console.log(error)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error occured while hashing password"
                                    })
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Passwords do not match"
                            })
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Invalid password entered!"
                        })
                    }
                }).catch((error) => {
                    console.log('Error occured while comparing passwords')
                    console.log(error)
                    res.json({
                        status: "FAILED",
                        message: "Error occured while comparing passwords"
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Cannot find user with User ID"
                })
            }
        }).catch((error) => {
            console.log(error)
            res.json({
                status: "FAILED",
                message: "Error occured while finding user with user ID"
            })
        })
    }
})

//ChangeUsername
router.post('/changeusername', (req, res) => {
    let {desiredUsername, userID} = req.body;
    desiredUsername = desiredUsername.trim();
    const name = desiredUsername

    if (desiredUsername == "") {
        res.json({
            status: "FAILED",
            message: "Username was not supplied!"
        });
    } else {
        // Check if user exist
        User.find({_id: userID})
        .then((data) => {
            if (data.length) {
                //User Exists
                User.find({name}).then(result => {
                    // A username exists
                    if (result.length) {
                        res.json({
                            status: "FAILED",
                            message: "User with the provided username already exists"
                        })  
                    } else {
                        User.findOneAndUpdate({_id: userID}, {name: desiredUsername}).then(function(){
                            console.log("SUCCESS1")
                            res.json({
                                status: "SUCCESS",
                                message: "Change Username Successful"
                            })
                        })
                        .catch(err => {
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "An error occured while checking for existing user"
                            })
                        });
                    }
                })
                
                } else {
                    res.json({
                        status: "FAILED",
                        message: "User not found!"
                    })
                }
            })
            .catch(err => {
                res.json({
                    status: "FAILED",
                    message: " An error occured while checking for existing user"
                })
        })
    }
})

//Change bio
router.post('/changebio', (req, res) => {
    let {bio, userID} = req.body;

    User.find({_id: userID}).then((data) => {
        if (data.length) {
            User.findOneAndUpdate({_id: userID}, {bio: bio}).then(function(){
                res.json({
                    status: "SUCCESS",
                    message: "Change Bio Successful"
                })
            })
            .catch(err => {
                console.log('Error occured while changing user with ID: ' + userID + '... bio. This was the error: ' + err);
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for existing user"
                })
            });
        } else {
            res.json({
                status: "FAILED",
                message: "User not found!"
            })
        }
    })
    .catch(err => {
        console.log(err);
        res.json({
            status: "FAILED",
            message: "An error occured while checking for existing user"
        })
    })
})

//search page user
router.get('/searchpageusersearch/:val', (req, res) => {
    let val = req.params.val;
    //Check Input fields
    if (val == "") {
        res.json({
            status: "FAILED",
            message: "Search box empty!"
        });
    } else {
        function sendResponse(foundArray) {
            console.log("Params Recieved")
            console.log(foundArray)
            res.json({
                status: "SUCCESS",
                message: "Search successful",
                data: foundArray
            })
        }
        //Find User
        async function findUsers() {
            var foundArray = []
            await User.find({name: {$regex: `^${val}`, $options: 'i'}}).then(data =>{
                if (data.length) {
                    var itemsProcessed = 0;
                    data.forEach(function (item, index) {
                        foundArray.push({pubId: data[index].secondId, name: data[index].name, displayName: data[index].displayName, followers: data[index].followers.length, following: data[index].following.length, totalLikes: data[index].totalLikes, profileKey: data[index].profileImageKey, badges: data[index].badges, bio: data[index].bio, privateAccount: data[index].privateAccount})
                        itemsProcessed++;
                        if(itemsProcessed === data.length) {
                            console.log("Before Function")
                            console.log(foundArray)
                            sendResponse(foundArray);
                        }
                    });
                } else {
                    res.json({
                        status: "FAILED",
                        message: "No results"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while searching Error: S2"
                })
            });
        }
        findUsers()
    }
})



//POLL AREA

//Create Poll
router.post('/createpollpost', (req, res) => {
    let {pollTitle, pollSubTitle, optionOne, optionOnesColor, optionTwo, optionTwosColor, optionThree, optionThreesColor, optionFour, optionFoursColor, optionFive, optionFivesColor, optionSix, optionSixesColor, totalNumberOfOptions, pollCreatorId, sentAllowScreenShots} = req.body;
    //Create important ones
    const optionOnesVotes = []
    const optionTwosVotes = []
    const optionThreesVotes = []
    const optionFoursVotes = []
    const optionFivesVotes = []
    const optionSixesVotes = []
    const pollUpVotes = []
    const pollDownVotes = []
    const pollComments = []
    var currentdate = new Date(); 
    //
    var twoDigitDate = ''
    if (currentdate.getDate() < 10) {
        twoDigitDate = '0' + currentdate.getDate()
    } else {
        twoDigitDate = currentdate.getDate()
    }
    //
    var twoDigitMonth = ''
    var recievedMonth = currentdate.getMonth()+1
    if (recievedMonth < 10) {
        twoDigitMonth = '0' + recievedMonth
    } else {
        twoDigitMonth = recievedMonth
    }
    //
    var twoDigitHour = ''
    if (currentdate.getHours() < 10) {
        twoDigitHour = '0' + currentdate.getHours()
    } else {
        twoDigitHour = currentdate.getHours()
    }
    //
    var twoDigitMinutes = ''
    if (currentdate.getMinutes() < 10) {
        twoDigitMinutes = '0' + currentdate.getMinutes()
    } else {
        twoDigitMinutes = currentdate.getMinutes()
    }
    //
    var twoDigitSeconds = ''
    if (currentdate.getSeconds() < 10) {
        twoDigitSeconds = '0' + currentdate.getSeconds()
    } else {
        twoDigitSeconds = currentdate.getSeconds()
    }
    //
    var datetime = twoDigitDate + "/"
    + twoDigitMonth  + "/" 
    + currentdate.getFullYear() + " @ "  
    + twoDigitHour + ":"  
    + twoDigitMinutes + ":" 
    + twoDigitSeconds;
    //allowScreenShots set up
    console.log(sentAllowScreenShots)
    var allowScreenShots = sentAllowScreenShots
    if (sentAllowScreenShots == true) {
        console.log("sent allow ss was true")
        allowScreenShots = true
    } else if (sentAllowScreenShots == false) {
        console.log("sent allow ss was false")
        allowScreenShots = false
    } else {    
        console.log("Sent allow ss wasnt true or false so set true")
        allowScreenShots = true
    }
    console.log(`allowScreenShots ${allowScreenShots}`)
    //Check Input fields
    if (pollTitle == "" || pollSubTitle == "" || optionOne == "" || optionTwo == "") {
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else {
        //Try to create a new post
        User.find({_id: pollCreatorId}).then(data => {
            if (data.length) {
                const newPoll = new Poll({
                    pollTitle,
                    pollSubTitle,
                    optionOne,
                    optionOnesColor,
                    optionOnesVotes,
                    optionTwo,
                    optionTwosColor,
                    optionTwosVotes,
                    optionThree,
                    optionThreesColor,
                    optionThreesVotes,
                    optionFour,
                    optionFoursColor,
                    optionFoursVotes,
                    optionFive,
                    optionFivesColor,
                    optionFivesVotes,
                    optionSix,
                    optionSixesColor,
                    optionSixesVotes,
                    totalNumberOfOptions,
                    pollUpVotes,
                    pollDownVotes,
                    pollCreatorId,
                    pollComments: pollComments,
                    datePosted: datetime,
                    allowScreenShots: allowScreenShots
                });
        
                newPoll.save().then(result => {
                    res.json({
                        status: "SUCCESS",
                        message: "Poll creation successful",
                        data: result
                    })
                })
                .catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while creating a Poll!"
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "A user could not be found with ur ID"
                })
            } 
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occured while checking for user with ID"
            })
        });
    }
})

//search for Poll
router.post('/searchforpollposts', (req, res) => {
    let {pubId, userId} = req.body;
    //Check Input fields
    if (pubId == "" || userId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({secondId: pubId}).then(result => {
            if (result.length) {
                //User Exists
                User.find({_id: userId}).then(userGettingPollPosts => {
                    if (userGettingPollPosts.length) {
                        if (result[0].blockedAccounts.includes(userGettingPollPosts[0].secondId)) {
                            // User is blocked so do not send posts
                            res.json({
                                status: "FAILED",
                                message: "User not found."
                            })
                        } else {
                            // User exists
                            async function findPolls() {
                                var resultMain = result[0]
                                var foundPollCreatorId = resultMain._id
                                await Poll.find({pollCreatorId: foundPollCreatorId}).then(data =>{
                                    if (data.length) {
                                        var sendBackArray = [];
                                        var itemsProcessed = 0;
                                        data.forEach(function (item, index) {
                                            var pollUpOrDownVoted = "Neither";
                                            var userVotedFor = "None"
                                            if (data[index].pollUpVotes.includes(userId)) {
                                                pollUpOrDownVoted = "UpVoted"
                                            } else if (data[index].pollDownVotes.includes(userId)) {
                                                pollUpOrDownVoted = "DownVoted"
                                            } else {
                                                pollUpOrDownVoted = "Neither"
                                            }
                                            if (data[index].optionOnesVotes.includes(userId)){
                                                userVotedFor = "One"
                                            } else if (data[index].optionTwosVotes.includes(userId)){
                                                userVotedFor = "Two"
                                            } else if (data[index].optionThreesVotes.includes(userId)){
                                                userVotedFor = "Three"
                                            } else if (data[index].optionFoursVotes.includes(userId)){
                                                userVotedFor = "Four"
                                            } else if (data[index].optionFivesVotes.includes(userId)){
                                                userVotedFor = "Five"
                                            } else if (data[index].optionSixesVotes.includes(userId)){
                                                userVotedFor = "Six"
                                            } else {
                                                userVotedFor = "None"
                                            }
                                            if (data.length) {
                                                const sendBackObject = {
                                                    _id: data[index]._id,
                                                    pollTitle: data[index].pollTitle,
                                                    pollSubTitle: data[index].pollSubTitle,
                                                    optionOne: data[index].optionOne,
                                                    optionOnesColor: data[index].optionOnesColor,
                                                    optionOnesVotes: data[index].optionOnesVotes.length,
                                                    optionTwo: data[index].optionTwo,
                                                    optionTwosColor: data[index].optionTwosColor,
                                                    optionTwosVotes: data[index].optionTwosVotes.length,
                                                    optionThree: data[index].optionThree,
                                                    optionThreesColor: data[index].optionThreesColor,
                                                    optionThreesVotes: data[index].optionThreesVotes.length,
                                                    optionFour: data[index].optionFour,
                                                    optionFoursColor: data[index].optionFoursColor,
                                                    optionFoursVotes: data[index].optionFoursVotes.length,
                                                    optionFive: data[index].optionFive,
                                                    optionFivesColor: data[index].optionFivesColor,
                                                    optionFivesVotes: data[index].optionFivesVotes.length,
                                                    optionSix: data[index].optionSix,
                                                    optionSixesColor: data[index].optionSixesColor,
                                                    optionSixesVotes: data[index].optionSixesVotes.length,
                                                    totalNumberOfOptions: data[index].totalNumberOfOptions,
                                                    pollUpOrDownVotes: (data[index].pollUpVotes.length-data[index].pollDownVotes.length),
                                                    votedFor: userVotedFor,
                                                    pollUpOrDownVoted: pollUpOrDownVoted,
                                                    pollComments: data[index].pollComments,
                                                    creatorPfpKey: resultMain.profileImageKey,
                                                    creatorName: resultMain.name,
                                                    creatorDisplayName: resultMain.displayName,
                                                    datePosted: data[index].datePosted,
                                                    allowScreenShots: data[index].allowScreenShots
                                                }
                                                sendBackArray.push(sendBackObject)
            
                                                itemsProcessed++;
                                                if(itemsProcessed === data.length) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Poll search successful",
                                                        data: sendBackArray
                                                    })
                                                }
                                            } else {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Nothing could be found"
                                                })
                                            }
                                        })
                                    } else {
                                        res.json({
                                            status: "FAILED",
                                            message: "No Poll Posts"
                                        })
                                    }
                                })
                            }
                            findPolls()
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Cannot find user."
                        })
                    }
                }).catch(error => {
                    console.log(error)
                    console.log('An error occured while finding user with ID: ' + userId)
                    res.json({
                        status: "FAILED",
                        message: "Cannot find user"
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "A user could not be found with name"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//Poll Comment Post
router.post('/pollpostcomment', (req, res) => {
    let {comment, userName, userId, pollId} = req.body;
    comment = comment.trim();
    //Check Input fields
    if (comment == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].name == userName) {
                    async function findPolls() {
                        var currentdate = new Date(); 
                        //
                        var twoDigitDate = ''
                        if (currentdate.getDate() < 10) {
                            twoDigitDate = '0' + currentdate.getDate()
                        } else {
                            twoDigitDate = currentdate.getDate()
                        }
                        //
                        var twoDigitMonth = ''
                        var recievedMonth = currentdate.getMonth()+1
                        if (recievedMonth < 10) {
                            twoDigitMonth = '0' + recievedMonth
                        } else {
                            twoDigitMonth = recievedMonth
                        }
                        //
                        var twoDigitHour = ''
                        if (currentdate.getHours() < 10) {
                            twoDigitHour = '0' + currentdate.getHours()
                        } else {
                            twoDigitHour = currentdate.getHours()
                        }
                        //
                        var twoDigitMinutes = ''
                        if (currentdate.getMinutes() < 10) {
                            twoDigitMinutes = '0' + currentdate.getMinutes()
                        } else {
                            twoDigitMinutes = currentdate.getMinutes()
                        }
                        //
                        var twoDigitSeconds = ''
                        if (currentdate.getSeconds() < 10) {
                            twoDigitSeconds = '0' + currentdate.getSeconds()
                        } else {
                            twoDigitSeconds = currentdate.getSeconds()
                        }
                        //
                        var datetime = twoDigitDate + "/"
                        + twoDigitMonth  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + twoDigitHour + ":"  
                        + twoDigitMinutes + ":" 
                        + twoDigitSeconds;
                        var objectId = new mongodb.ObjectID()
                        console.log(objectId)
                        var commentForPost = {commentId: objectId, commenterId: userId, commentsText: comment, commentUpVotes: [], commentDownVotes: [], commentReplies: [], datePosted: datetime}
                        Poll.findOneAndUpdate({_id: pollId}, { $push: { pollComments: commentForPost } }).then(function(){
                            console.log("SUCCESS1")
                            res.json({
                                status: "SUCCESS",
                                message: "Comment upload successful",
                            })
                        })
                        .catch(err => {
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "Error updating"
                            })
                        });
                    }
                    findPolls()
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A name based error occured"
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "An id based error occured"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//Poll Comment Reply Post
router.post('/pollpostcommentreply', (req, res) => {
    let {comment, userName, userId, pollId, commentId} = req.body;
    comment = comment.trim();
    //Check Input fields
    if (comment == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].name == userName) {
                    Poll.find({_id: pollId}).then(data => {
                        if (data.length) {
                            var pollComments = data[0].pollComments
                            async function findThreads(sentIndex) {
                                var currentdate = new Date(); 
                                //
                                var twoDigitDate = ''
                                if (currentdate.getDate() < 10) {
                                    twoDigitDate = '0' + currentdate.getDate()
                                } else {
                                    twoDigitDate = currentdate.getDate()
                                }
                                //
                                var twoDigitMonth = ''
                                var recievedMonth = currentdate.getMonth()+1
                                if (recievedMonth < 10) {
                                    twoDigitMonth = '0' + recievedMonth
                                } else {
                                    twoDigitMonth = recievedMonth
                                }
                                //
                                var twoDigitHour = ''
                                if (currentdate.getHours() < 10) {
                                    twoDigitHour = '0' + currentdate.getHours()
                                } else {
                                    twoDigitHour = currentdate.getHours()
                                }
                                //
                                var twoDigitMinutes = ''
                                if (currentdate.getMinutes() < 10) {
                                    twoDigitMinutes = '0' + currentdate.getMinutes()
                                } else {
                                    twoDigitMinutes = currentdate.getMinutes()
                                }
                                //
                                var twoDigitSeconds = ''
                                if (currentdate.getSeconds() < 10) {
                                    twoDigitSeconds = '0' + currentdate.getSeconds()
                                } else {
                                    twoDigitSeconds = currentdate.getSeconds()
                                }
                                //
                                var datetime = twoDigitDate + "/"
                                + twoDigitMonth  + "/" 
                                + currentdate.getFullYear() + " @ "  
                                + twoDigitHour + ":"  
                                + twoDigitMinutes + ":" 
                                + twoDigitSeconds;
                                var objectId = new mongodb.ObjectID()
                                console.log(objectId)
                                var commentForPost = {commentId: objectId, commenterId: userId, commentsText: comment, commentUpVotes: [], commentDownVotes: [], datePosted: datetime}
                                Poll.findOneAndUpdate({_id: pollComments}, { $push: { [`pollComments.${sentIndex}.commentReplies`]: commentForPost } }).then(function(){
                                    console.log("SUCCESS1")
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Comment upload successful",
                                    })
                                })
                                .catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error updating"
                                    })
                                });
                            }
                            var itemsProcessed = 0
                            pollComments.forEach(function (item, index) {
                                console.log(pollComments[index].commentId)
                                console.log(commentId)
                                if (pollComments[index].commentId == commentId) {
                                    if (itemsProcessed !== null) {
                                        console.log("Found at index:")
                                        console.log(index)
                                        findThreads(index)
                                        itemsProcessed = null
                                    }
                                } else {
                                    if (itemsProcessed !== null) {
                                        itemsProcessed++;
                                        if(itemsProcessed == pollComments.length) {
                                            res.json({
                                                status: "FAILED",
                                                message: "Couldn't find comment."
                                            })
                                        }
                                    }
                                }
                            });
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "A poll based error occured"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A name based error occured"
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "An id based error occured"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//search for Poll comments
router.get('/searchforpollcomments/:sentpollid/:sentuserid', (req, res) => {
    let sentPollId = req.params.sentpollid
    let sentUserId = req.params.sentuserid
    //Check Input fields
    if (sentPollId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentPollId)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findPolls() {
            await Poll.find({_id: sentPollId}).then(data => {
                if (data.length) {
                    var nameSendBackObject = [];
                    var pollComments = data[0].pollComments;
                    if (pollComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        var itemsProcessed = 0;
                        console.log(pollComments)
                        pollComments.forEach(function (item, index) {
                            User.find({_id: pollComments[index].commenterId}).then(result => {
                                if (result.length) {
                                    console.log(data)
                                    console.log(data[0].pollComments[index].commentText)
                                    var commentUpVotes = (data[0].pollComments[index].commentUpVotes.length - data[0].pollComments[index].commentDownVotes.length)
                                    var commentUpVoted = false
                                    if (data[0].pollComments[index].commentUpVotes.includes(sentUserId)) {
                                        commentUpVoted = true
                                    }
                                    var commentDownVoted = false
                                    if (data[0].pollComments[index].commentDownVotes.includes(sentUserId)) {
                                        commentDownVoted = true
                                    }
                                    nameSendBackObject.push({commentId: data[0].pollComments[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: data[0].pollComments[index].commentsText, commentUpVotes: commentUpVotes, commentReplies: data[0].pollComments[index].commentReplies.length, datePosted: data[0].pollComments[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occured while checking for comment creator"
                                    })
                                }
                                itemsProcessed++;
                                if(itemsProcessed === pollComments.length) {
                                    console.log("Before Function")
                                    console.log(nameSendBackObject)
                                    sendResponse(nameSendBackObject);
                                }
                            })
                        })
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for polls 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for polls 2"
                })
            });
        }
        findPolls()
    }
})

//vote on poll
router.post('/voteonpoll', (req, res) => {
    let {userId, optionSelected, pollId} = req.body;
    //Check Input fields
    if (userId == "" || optionSelected == "" || pollId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(optionSelected)
        async function addVote() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Poll.find({_id: pollId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            if (findUser.pollCreatorId !== userId) {
                                if (findUser.optionOnesVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { optionOnesVotes: userId }}).then(function(){
                                        if (optionSelected !== "optionOnesVotes") {
                                            Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected]: userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Vote successful",
                                                    data: {lastVote: "One"}
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Pulled",
                                                data: {lastVote: "One"}
                                            })
                                        }
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.optionTwosVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { optionTwosVotes: userId }}).then(function(){
                                        if (optionSelected !== "optionTwosVotes") {
                                            Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected]: userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Vote successful",
                                                    data: {lastVote: "Two"}
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error pushing"
                                                })
                                            });
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Pulled",
                                                data: {lastVote: "Two"}
                                            })
                                        }
                                    }) 
                                } else if (findUser.optionThreesVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { optionThreesVotes: userId }}).then(function(){
                                        if (optionSelected !== "optionThreesVotes") {
                                            Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected]: userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Vote successful",
                                                    data: {lastVote: "Three"}
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error pulling"
                                                })
                                            });
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Pulled",
                                                data: {lastVote: "Three"}
                                            })
                                        } 
                                    }) 
                                } else if (findUser.optionFoursVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { optionFoursVotes: userId }}).then(function(){
                                        if (optionSelected !== "optionFoursVotes") {
                                            Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected]: userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Vote successful",
                                                    data: {lastVote: "Four"}
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error pulling"
                                                })
                                            });
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Pulled",
                                                data: {lastVote: "Four"}
                                            })
                                        }
                                    }) 
                                } else if (findUser.optionFivesVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { optionFivesVotes: userId }}).then(function(){
                                        if (optionSelected !== "optionFivesVotes") {
                                            Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected]: userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Vote successful",
                                                    data: {lastVote: "Five"}
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error pulling"
                                                })
                                            });
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Pulled",
                                                data: {lastVote: "Five"}
                                            })
                                        }
                                    }) 
                                } else if (findUser.optionSixesVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { optionSixesVotes: userId }}).then(function(){
                                        if (optionSelected !== "optionSixesVotes") {
                                            Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected]: userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Vote successful",
                                                    data: {lastVote: "Six"}
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error pulling"
                                                })
                                            });
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Pulled",
                                                data: {lastVote: "Six"}
                                            })
                                        }
                                    }) 
                                } else if (findUser.pollCreatorId == userId) {
                                    res.json({
                                        status: "FAILED",
                                        message: "You can't vote on your own post lol"
                                    })
                                } else {
                                    Poll.findOneAndUpdate({_id: pollId}, { $push: { [optionSelected] : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Vote successful",
                                            data: {lastVote: "None"}
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        }
                    })
                }
            })
        }
        addVote()
    }
})

//search Poll by pollID
router.post('/searchforpollpostsbyid', (req, res) => {
    let {pollId, userId} = req.body;
    //Check Input fields
    if (pollId == "" || userId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function findPolls() {
            await Poll.find({_id: pollId}).then(data =>{
                if (data.length) {
                    var userVotedFor = "None"
                    var pollUpOrDownVoted = "Neither";
                    if (data[0].pollUpVotes.includes(userId)) {
                        pollUpOrDownVoted = "UpVoted"
                    } else if (data[0].pollDownVotes.includes(userId)) {
                        pollUpOrDownVoted = "DownVoted"
                    } else {
                        pollUpOrDownVoted = "Neither"
                    }
                    if (data[0].optionOnesVotes.includes(userId)){
                        userVotedFor = "One"
                    } else if (data[0].optionTwosVotes.includes(userId)){
                        userVotedFor = "Two"
                    } else if (data[0].optionThreesVotes.includes(userId)){
                        userVotedFor = "Three"
                    } else if (data[0].optionFoursVotes.includes(userId)){
                        userVotedFor = "Four"
                    } else if (data[0].optionFivesVotes.includes(userId)){
                        userVotedFor = "Five"
                    } else if (data[0].optionSixesVotes.includes(userId)){
                        userVotedFor = "Six"
                    } else {
                        userVotedFor = "None"
                    }

                    const sendBackObject = [{
                        pollTitle: data[0].pollTitle,
                        pollSubTitle: data[0].pollSubTitle,
                        optionOne: data[0].optionOne,
                        optionOnesColor: data[0].optionOnesColor,
                        optionOnesVotes: data[0].optionOnesVotes.length,
                        optionTwo: data[0].optionTwo,
                        optionTwosColor: data[0].optionTwosColor,
                        optionTwosVotes: data[0].optionTwosVotes.length,
                        optionThree: data[0].optionThree,
                        optionThreesColor: data[0].optionThreesColor,
                        optionThreesVotes: data[0].optionThreesVotes.length,
                        optionFour: data[0].optionFour,
                        optionFoursColor: data[0].optionFoursColor,
                        optionFoursVotes: data[0].optionFoursVotes.length,
                        optionFive: data[0].optionFive,
                        optionFivesColor: data[0].optionFivesColor,
                        optionFivesVotes: data[0].optionFivesVotes.length,
                        optionSix: data[0].optionSix,
                        optionSixesColor: data[0].optionSixesColor,
                        optionSixesVotes: data[0].optionSixesVotes.length,
                        totalNumberOfOptions: data[0].totalNumberOfOptions,
                        pollUpOrDownVotes: (data[0].pollUpVotes.length-data[0].pollDownVotes.length),
                        votedFor: userVotedFor,
                        pollUpOrDownVoted: pollUpOrDownVoted,
                        pollComments: data[0].pollComments,
                        datePosted: data[0].datePosted
                    }]

                    res.json({
                        status: "SUCCESS",
                        message: "Poll search successful",
                        data: sendBackObject
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Nothing could be found"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "Error"
                })
            });
        }
        findPolls()
    }
})

//UpVote Poll
router.post('/upvotepoll', (req, res) => {
    let {userId, pollId} = req.body;
    //Check Input fields
    if (userId == "" || pollId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function upVotePoll() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Poll.find({_id: pollId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            console.log("Bruh")
                            console.log(findUser.pollCreatorId)
                            console.log(userId)
                            if (findUser.pollCreatorId == userId) {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant UpVote your own post lol"
                                })
                            } else {
                                console.log(findUser.pollCreatorId)
                                console.log(userId)
                                if (findUser.pollUpVotes.includes(userId)) {
                                    //User has poll UpVoted
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { pollUpVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post UpVote removed",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.pollDownVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { pollDownVotes : userId }}).then(function(){
                                        Poll.findOneAndUpdate({_id: pollId}, { $push: { pollUpVotes : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Post UpVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else {
                                    Poll.findOneAndUpdate({_id: pollId}, { $push: { pollUpVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post UpVoted",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Error with poll details"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error with user details"
                    })
                }
            })
        }
        upVotePoll()
    }
})

//DownVote Poll
router.post('/downvotepoll', (req, res) => {
    let {userId, pollId} = req.body;
    //Check Input fields
    if (userId == "" || pollId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function downVotePoll() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Poll.find({_id: pollId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            console.log("Bruh")
                            console.log(findUser.pollCreatorId)
                            console.log(userId)
                            if (findUser.pollCreatorId == userId) {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant DownVote your own post lol"
                                })
                            } else {
                                console.log(findUser.pollCreatorId)
                                console.log(userId)
                                if (findUser.pollDownVotes.includes(userId)) {
                                    //User has poll DownVoted
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { pollDownVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post DownVote removed",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.pollUpVotes.includes(userId)) {
                                    Poll.findOneAndUpdate({_id: pollId}, { $pull: { pollUpVotes : userId }}).then(function(){
                                        Poll.findOneAndUpdate({_id: pollId}, { $push: { pollDownVotes : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Post DownVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else {
                                    Poll.findOneAndUpdate({_id: pollId}, { $push: { pollDownVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post DownVoted",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Error with poll details"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error with user details"
                    })
                }
            })
        }
        downVotePoll()
    }
})

//search for thread comments
router.get('/getsinglepollcomment/:sentpollid/:sentuserid/:sentcommentid', (req, res) => {
    let sentPollId = req.params.sentpollid
    let sentUserId = req.params.sentuserid
    let sentCommentId = req.params.sentcommentid
    //Check Input fields
    console.log("Poll Id:")
    console.log(sentPollId)
    console.log("Comment Id:")
    console.log(sentCommentId)
    if (sentPollId == "" || sentUserId == "" || sentCommentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentPollId)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findPolls() {
            await Poll.find({_id: sentPollId}).then(data => {
                if (data.length) {
                    var pollComments = data[0].pollComments
                    var nameSendBackObject = [];
                    if (pollComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        function forAwaits(index) {
                            User.find({_id: pollComments[index].commenterId}).then(result => {
                                if (result.length) {
                                    var commentUpVotes = (data[0].pollComments[index].commentUpVotes.length - data[0].pollComments[index].commentDownVotes.length)
                                    var commentUpVoted = false
                                    if (data[0].pollComments[index].commentUpVotes.includes(sentUserId)) {
                                        commentUpVoted = true
                                    }
                                    var commentDownVoted = false
                                    if (data[0].pollComments[index].commentDownVotes.includes(sentUserId)) {
                                        commentDownVoted = true
                                    }
                                    nameSendBackObject.push({commentId: data[0].pollComments[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: data[0].pollComments[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: data[0].pollComments[index].commentDownVotes, commentReplies: data[0].pollComments[index].commentReplies.length, datePosted: data[0].pollComments[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                    sendResponse(nameSendBackObject)
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "Couldn't find user."
                                    })
                                }
                            })
                        }
                        var itemsProcessed  = 0
                        pollComments.forEach(function (item, index) {
                            console.log(pollComments[index].commentId)
                            if (pollComments[index].commentId == sentCommentId) {
                                if (itemsProcessed !== null) {
                                    console.log("Found at index:")
                                    console.log(index)
                                    forAwaits(index)
                                    itemsProcessed = null
                                }
                            } else {
                                if (itemsProcessed !== null) {
                                    itemsProcessed++;
                                    if(itemsProcessed == pollComments.length) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Couldn't find comment."
                                        })
                                    }
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for polls 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for polls 2"
                })
            });
        }
        findPolls()
    }
})

//search for thread comments
router.get('/searchforpollcommentreplies/:sentpollid/:sentuserid/:sentcommentid', (req, res) => {
    let sentPollId = req.params.sentpollid
    let sentUserId = req.params.sentuserid
    let sentCommentId = req.params.sentcommentid
    //Check Input fields
    if (sentPollId == "" || sentUserId == "" || sentCommentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentPollId)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findPolls() {
            await Poll.find({_id: sentPollId}).then(data => {
                if (data.length) {
                    var nameSendBackObject = [];
                    var pollComments = data[0].pollComments;
                    if (pollComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        function forAwaits(index) {
                            var itemsProcessed = 0;
                            var commentReplies = data[0].pollComments[index].commentReplies;
                            if (commentReplies.length == 0) {
                                res.json({
                                    status: "FAILED",
                                    message: "No replies"
                                })
                            } else {
                                console.log(commentReplies)
                                commentReplies.forEach(function (item, index) {
                                    User.find({_id: commentReplies[index].commenterId}).then(result => {
                                        if (result.length) {
                                            console.log(data)
                                            console.log(commentReplies[index].commentText)
                                            var commentUpVotes = (commentReplies[index].commentUpVotes.length - commentReplies[index].commentDownVotes.length)
                                            var commentUpVoted = false
                                            if (commentReplies[index].commentUpVotes.includes(sentUserId)) {
                                                commentUpVoted = true
                                            }
                                            var commentDownVoted = false
                                            if (commentReplies[index].commentDownVotes.includes(sentUserId)) {
                                                commentDownVoted = true
                                            }
                                            nameSendBackObject.push({commentId: commentReplies[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: commentReplies[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: commentReplies[index].commentDownVotes, datePosted: commentReplies[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                        } else {
                                            res.json({
                                                status: "FAILED",
                                                message: "An error occured while checking for comment creator"
                                            })
                                        }
                                        itemsProcessed++;
                                        if(itemsProcessed === commentReplies.length) {
                                            console.log("Before Function")
                                            console.log(nameSendBackObject)
                                            sendResponse(nameSendBackObject);
                                        }
                                    })
                                })
                            }
                        }
                        var itemsProcessed = 0
                        pollComments.forEach(function (item, index) {
                            console.log(pollComments[index].commentId)
                            if (pollComments[index].commentId == sentCommentId) {
                                if (itemsProcessed !== null) {
                                    console.log("Found at index:")
                                    console.log(index)
                                    forAwaits(index)
                                    itemsProcessed = null
                                }
                            } else {
                                if (itemsProcessed !== null) {
                                    itemsProcessed++;
                                    if(itemsProcessed == pollComments.length) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Couldn't find comment."
                                        })
                                    }
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for polls 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for polls 2"
                })
            });
        }
        findPolls()
    }
})

//Delete Poll
router.post('/deletepoll', (req, res) => {
    let {userId, pollId} = req.body;
    //Check Input fields
    if (userId == "" || pollId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function deletePoll() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Poll.find({_id: pollId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            if (findUser.pollCreatorId == userId) {
                                Poll.deleteOne({_id: findUser._id}).then(function(){
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Deleted"
                                    })
                                }).catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error Deleting"
                                    })
                                });
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Error with user"
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Error with poll details"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error with user details"
                    })
                }
            })
        }
        deletePoll()
    }
})

//Post Image
router.post('/postImage', upload.single('image'), async (req, res) => {
    let {title, description, creatorId, sentAllowScreenShots} = req.body;
    //const file = req.file;
    if (!req.file) {
        console.log("No file recieved.")
        return res.send({
            status: "FAILED",
            message: "No file sent."
        });
    } else {
        console.log('File has been recieved: ', req.file.filename)
        if (typeof title !== 'string') {
            title = ""
        } 
        if (typeof description !== 'string') {
            description = ""
        }
        if (creatorId == null || typeof creatorId == 'undefined') {
            res.json({
                status: "FAILED",
                message: "Empty values sent."
            })
        } else {
            title = title.trim()
            description = description.trim()
            //console.log(file)
            console.log(title)
            console.log(description)
            console.log(creatorId)
            User.find({_id: creatorId}).then(result => {
                if (result.length) {
                    var currentdate = new Date(); 
                    //
                    var twoDigitDate = ''
                    if (currentdate.getDate() < 10) {
                        twoDigitDate = '0' + currentdate.getDate()
                    } else {
                        twoDigitDate = currentdate.getDate()
                    }
                    //
                    var twoDigitMonth = ''
                    var recievedMonth = currentdate.getMonth()+1
                    if (recievedMonth < 10) {
                        twoDigitMonth = '0' + recievedMonth
                    } else {
                        twoDigitMonth = recievedMonth
                    }
                    //
                    var twoDigitHour = ''
                    if (currentdate.getHours() < 10) {
                        twoDigitHour = '0' + currentdate.getHours()
                    } else {
                        twoDigitHour = currentdate.getHours()
                    }
                    //
                    var twoDigitMinutes = ''
                    if (currentdate.getMinutes() < 10) {
                        twoDigitMinutes = '0' + currentdate.getMinutes()
                    } else {
                        twoDigitMinutes = currentdate.getMinutes()
                    }
                    //
                    var twoDigitSeconds = ''
                    if (currentdate.getSeconds() < 10) {
                        twoDigitSeconds = '0' + currentdate.getSeconds()
                    } else {
                        twoDigitSeconds = currentdate.getSeconds()
                    }
                    //
                    var datetime = twoDigitDate + "/"
                    + twoDigitMonth  + "/" 
                    + currentdate.getFullYear() + " @ "  
                    + twoDigitHour + ":"  
                    + twoDigitMinutes + ":" 
                    + twoDigitSeconds;
                    //allowScreenShots set up
                    console.log(sentAllowScreenShots)
                    var allowScreenShots = sentAllowScreenShots
                    if (sentAllowScreenShots == true || allowScreenShots == "true") {
                        console.log("sent allow ss was true")
                        allowScreenShots = true
                    } else if (sentAllowScreenShots == false || allowScreenShots == "false") {
                        console.log("sent allow ss was false")
                        allowScreenShots = false
                    } else {    
                        console.log("Sent allow ss wasnt true or false so set true")
                        allowScreenShots = true
                    }
                    console.log(`allowScreenShots ${allowScreenShots}`)
                    const newImage = new ImagePost({
                        imageKey: req.file.filename,
                        imageTitle: title, 
                        imageDescription: description,
                        imageUpVotes: [],
                        imageDownVotes: [],
                        imageCreatorId: creatorId,
                        imageComments: [],
                        datePosted: datetime,
                        allowScreenShots: allowScreenShots,
                    });

                    newImage.save().then(result => {
                        res.json({
                            status: "SUCCESS",
                            message: "Post successful",
                        })
                    })
                    .catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while saving post!"
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while getting user data!"
                    })
                }
            }).catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "Error occured finding user."
                })
            })
        }
    }
})

//Post Profile Image
router.post('/postProfileImage', upload.single('image'), async (req, res) => {
    let {userId} = req.body;
    //const file = req.file;
    if (!req.file) {
        console.log("No file recieved.")
        return res.send({
            status: "FAILED",
            message: "No file sent."
        });
    } else {
        console.log('File has been recieved: ', req.file.filename)
        //check if user exists
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].profileImageKey != "") {
                    //Remove previous profile image if the user already has one
                    var filepath = path.resolve(process.env.UPLOADED_PATH, result[0].profileImageKey)
                    fs.unlink(filepath, (err) => {
                        if (err) {
                            console.log('An error occured while deleting image with imageKey: ' + result[0].profileImageKey)
                            console.log(err)
                        } else {
                            console.log("Previous profile image deleted")
                        }
                    })
                }
                User.findOneAndUpdate({_id: userId}, { profileImageKey: req.file.filename }).then(function(){
                    console.log("SUCCESS1")
                    res.json({
                        status: "SUCCESS",
                        message: "Profile Image Updated",
                    })
                })
                .catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "Error updating"
                    })
                });
            } else {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while getting user data!"
                })
            }
        })
        .catch(err => { 
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Error Searching"
            })
        });
    }
})

//Get Images From Profile
router.post('/getImagesFromProfile', (req, res) => {
    let {pubId, userId} = req.body;

    const getImagesAndSendToUser = (findUser) => {
        ImagePost.find({imageCreatorId: findUser._id}).then(result => {
            if (result.length) {
                var allImageKeys = []
                var itemsProcessed = 0;
                result.forEach(function (item, index) {
                    var imageKey = result[index].imageKey
                    var imageTitle = result[index].imageTitle
                    var imageDescription = result[index].imageDescription
                    var imageUpVotes = (result[index].imageUpVotes.length-result[index].imageDownVotes.length)
                    var imageComments = result[index].imageComments
                    var creatorName = findUser.name
                    var creatorDisplayName = findUser.displayName
                    var creatorPfpKey = findUser.profileImageKey
                    var datePosted = result[index].datePosted
                    var imageUpVoted = false
                    if (result[index].imageUpVotes.includes(userId)) {
                        imageUpVoted = true
                    }
                    var imageDownVoted = false
                    if (result[index].imageDownVotes.includes(userId)) {
                        imageDownVoted = true
                    }
                    var allowScreenShots = result[index].allowScreenShots
                    allImageKeys.push({imageKey: imageKey, imageTitle: imageTitle, imageDescription: imageDescription, imageUpVotes: imageUpVotes, imageComments: imageComments, creatorName: creatorName, creatorDisplayName: creatorDisplayName, creatorPfpKey: creatorPfpKey, datePosted: datePosted, imageUpVoted: imageUpVoted, imageDownVoted: imageDownVoted, allowScreenShots: allowScreenShots})
                    itemsProcessed++;
                    if(itemsProcessed === result.length) {
                        res.json({
                            status: "SUCCESS",
                            message: "Posts found",
                            data: allImageKeys
                        })
                    }
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "This user has no image posts!"
                })
            }
        }).catch(error => {
            console.log('An error occured while getting user images. User ID: ' + findUser._id)
            console.log(error)
            res.json({
                status: "FAILED",
                message: "An error occured while getting user images"
            })
        })
    }

    User.find({secondId: pubId}).then(data => { 
        User.find({_id: userId}).then(secondData => {
            const userPublicID = secondData[0].secondId;
            if (data[0].blockedAccounts.includes(userPublicID)) {
                res.json({
                    status: "FAILED",
                    message: "User not found."
                })
            } else {
                if (data[0].privateAccount != true) {
                    if (data.length) {
                        var findUser = data[0]
                        getImagesAndSendToUser(findUser)
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while getting user data!"
                        })
                    }
                } else {
                    //ACCOUNT IS PRIVAT
                    const isFollowingUser = data[0].followers.includes(userPublicID);
                    if (isFollowingUser == true) {
                        //User is following this account so send posts
                        getImagesAndSendToUser(data[0])
                    } else {
                        //User is not following this account so DO NOT SEND POSTS
                        res.json({
                            status: "FAILED",
                            message: "This user has no image posts!"
                        })
                    }
                }
            }
        }).catch(error => {
            console.log('An error occured while finding user with ID: ' + userId + '.')
            console.log(error)
            res.json({
                status: "FAILED",
                message: "An error occured while finding user."
            })
        })
    })
})

//Get Images From Profile
router.post('/getimageupvoteswithkey', (req, res) => {
    let {imageKey, userId} = req.body;
    ImagePost.find({imageKey: imageKey}).then(result => {
        if (result.length) {
            var imageUpVotes = (result[0].imageUpVotes.length-result[0].imageDownVotes.length)
            var imageUpVoted = false
            if (result[0].imageUpVotes.includes(userId)) {
                imageUpVoted = true
            }
            var imageDownVoted = false
            if (result[0].imageDownVotes.includes(userId)) {
                imageDownVoted = true
            }
            res.json({
                status: "SUCCESS",
                message: "Posts found",
                data: {imageUpVotes: imageUpVotes, imageUpVoted: imageUpVoted, imageDownVoted: imageDownVoted}
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Error finding post!"
            })
        }
    }).catch(err => { 
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error Searching"
        })
    });
})

//Get Profile Pic
router.get('/getProfilePic/:pubId', (req, res) => {
    let pubId = req.params.pubId;
    console.log("Before Find")
    User.find({secondId: pubId}).then(data => { 
        if (data.length) { 
            console.log("After Find")
            var userData = data[0]
            console.log(userData)
            var profileKey = userData.profileImageKey
            console.log(profileKey)
            if (profileKey !== "") {
                res.json({
                    status: "SUCCESS",
                    message: "Profile image found.",
                    data: profileKey
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "No profile image."
                })
            }
        } else {
            res.json({
                status: "FAILED",
                message: "An error occured while finding user."
            })
        }
    })
    .catch(err => { 
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error Searching"
        })
    });
})

//Image comment Post
router.post('/imagepostcomment', (req, res) => {
    let {comment, userName, userId, imageKey} = req.body;
    comment = comment.trim();
    //Check Input fields
    if (comment == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].name == userName) {
                    async function findImages() {
                        var currentdate = new Date(); 
                        //
                        var twoDigitDate = ''
                        if (currentdate.getDate() < 10) {
                            twoDigitDate = '0' + currentdate.getDate()
                        } else {
                            twoDigitDate = currentdate.getDate()
                        }
                        //
                        var twoDigitMonth = ''
                        var recievedMonth = currentdate.getMonth()+1
                        if (recievedMonth < 10) {
                            twoDigitMonth = '0' + recievedMonth
                        } else {
                            twoDigitMonth = recievedMonth
                        }
                        //
                        var twoDigitHour = ''
                        if (currentdate.getHours() < 10) {
                            twoDigitHour = '0' + currentdate.getHours()
                        } else {
                            twoDigitHour = currentdate.getHours()
                        }
                        //
                        var twoDigitMinutes = ''
                        if (currentdate.getMinutes() < 10) {
                            twoDigitMinutes = '0' + currentdate.getMinutes()
                        } else {
                            twoDigitMinutes = currentdate.getMinutes()
                        }
                        //
                        var twoDigitSeconds = ''
                        if (currentdate.getSeconds() < 10) {
                            twoDigitSeconds = '0' + currentdate.getSeconds()
                        } else {
                            twoDigitSeconds = currentdate.getSeconds()
                        }
                        //
                        var datetime = twoDigitDate + "/"
                        + twoDigitMonth  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + twoDigitHour + ":"  
                        + twoDigitMinutes + ":" 
                        + twoDigitSeconds;
                        var objectId = new mongodb.ObjectID()
                        console.log(objectId)
                        var commentForPost = {commentId: objectId, commenterId: userId, commentsText: comment, commentUpVotes: [], commentDownVotes: [], commentReplies: [], datePosted: datetime}
                        ImagePost.findOneAndUpdate({imageKey: imageKey}, { $push: { imageComments: commentForPost } }).then(function(){
                            console.log("SUCCESS1")
                            res.json({
                                status: "SUCCESS",
                                message: "Comment upload successful",
                            })
                        })
                        .catch(err => {
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "Error updating"
                            })
                        });
                    }
                    findImages()
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A name based error occured"
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "An id based error occured"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//image Comment Reply Post
router.post('/imagepostcommentreply', (req, res) => {
    let {comment, userName, userId, imageKey, commentId} = req.body;
    comment = comment.trim();
    //Check Input fields
    if (comment == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].name == userName) {
                    ImagePost.find({imageKey: imageKey}).then(data => {
                        if (data.length) {
                            var imageComments = data[0].imageComments
                            async function findThreads(sentIndex) {
                                var currentdate = new Date(); 
                                //
                                var twoDigitDate = ''
                                if (currentdate.getDate() < 10) {
                                    twoDigitDate = '0' + currentdate.getDate()
                                } else {
                                    twoDigitDate = currentdate.getDate()
                                }
                                //
                                var twoDigitMonth = ''
                                var recievedMonth = currentdate.getMonth()+1
                                if (recievedMonth < 10) {
                                    twoDigitMonth = '0' + recievedMonth
                                } else {
                                    twoDigitMonth = recievedMonth
                                }
                                //
                                var twoDigitHour = ''
                                if (currentdate.getHours() < 10) {
                                    twoDigitHour = '0' + currentdate.getHours()
                                } else {
                                    twoDigitHour = currentdate.getHours()
                                }
                                //
                                var twoDigitMinutes = ''
                                if (currentdate.getMinutes() < 10) {
                                    twoDigitMinutes = '0' + currentdate.getMinutes()
                                } else {
                                    twoDigitMinutes = currentdate.getMinutes()
                                }
                                //
                                var twoDigitSeconds = ''
                                if (currentdate.getSeconds() < 10) {
                                    twoDigitSeconds = '0' + currentdate.getSeconds()
                                } else {
                                    twoDigitSeconds = currentdate.getSeconds()
                                }
                                //
                                var datetime = twoDigitDate + "/"
                                + twoDigitMonth  + "/" 
                                + currentdate.getFullYear() + " @ "  
                                + twoDigitHour + ":"  
                                + twoDigitMinutes + ":" 
                                + twoDigitSeconds;
                                var objectId = new mongodb.ObjectID()
                                console.log(objectId)
                                var commentForPost = {commentId: objectId, commenterId: userId, commentsText: comment, commentUpVotes: [], commentDownVotes: [], datePosted: datetime}
                                ImagePost.findOneAndUpdate({_id: imageKey}, { $push: { [`imageComments.${sentIndex}.commentReplies`]: commentForPost } }).then(function(){
                                    console.log("SUCCESS1")
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Comment upload successful",
                                    })
                                })
                                .catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error updating"
                                    })
                                });
                            }
                            var itemsProcessed = 0
                            imageComments.forEach(function (item, index) {
                                console.log(imageComments[index].commentId)
                                console.log(commentId)
                                if (imageComments[index].commentId == commentId) {
                                    if (itemsProcessed !== null) {
                                        console.log("Found at index:")
                                        console.log(index)
                                        findThreads(index)
                                        itemsProcessed = null
                                    }
                                } else {
                                    if (itemsProcessed !== null) {
                                        itemsProcessed++;
                                        if(itemsProcessed == imageComments.length) {
                                            res.json({
                                                status: "FAILED",
                                                message: "Couldn't find comment."
                                            })
                                        }
                                    }
                                }
                            });
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "A image post based error occured"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A name based error occured"
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "An id based error occured"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//search for image comments
router.get('/getimagecommentswithkey/:imageKey/:sentuserid', (req, res) => {
    let imageKey = req.params.imageKey;
    let sentUserId = req.params.sentuserid;
    //Check Input fields
    if (imageKey == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findComments() {
            await ImagePost.find({imageKey: imageKey}).then(data => {
                if (data.length) {
                    var nameSendBackObject = [];
                    var imageComments = data[0].imageComments;
                    var itemsProcessed = 0;
                    if (imageComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No Comments"
                        })
                    } else {
                        imageComments.forEach(function (item, index) {
                            User.find({_id: imageComments[index].commenterId}).then(result => {
                                if (result.length) {
                                    console.log(data)
                                    console.log(data[0].imageComments[index].commentText)
                                    var commentUpVotes = (data[0].imageComments[index].commentUpVotes.length - data[0].imageComments[index].commentDownVotes.length)
                                    var commentUpVoted = false
                                    if (data[0].imageComments[index].commentUpVotes.includes(sentUserId)) {
                                        commentUpVoted = true
                                    }
                                    var commentDownVoted = false
                                    if (data[0].imageComments[index].commentDownVotes.includes(sentUserId)) {
                                        commentDownVoted = true
                                    }
                                    nameSendBackObject.push({commentId: data[0].imageComments[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: data[0].imageComments[index].commentsText, commentUpVotes: commentUpVotes, commentReplies: data[0].imageComments[index].commentReplies.length, datePosted: data[0].imageComments[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occured while checking for comment creator"
                                    })
                                }
                                itemsProcessed++;
                                if(itemsProcessed === imageComments.length) {
                                    console.log("Before Function")
                                    console.log(nameSendBackObject)
                                    sendResponse(nameSendBackObject);
                                }
                            })
                        })
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for polls 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for polls 2"
                })
            });
        }
        findComments()
    }
})

//UpVote Image
router.post('/upvoteimage', (req, res) => {
    let {userId, imageId} = req.body;
    //Check Input fields
    if (userId == "" || imageId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function upVoteImage() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    ImagePost.find({imageKey: imageId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            console.log("Bruh")
                            console.log(findUser.imageCreatorId)
                            console.log(userId)
                            if (findUser.imageCreatorId == userId) {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant up vote your own post lol"
                                })
                            } else {
                                console.log(findUser.imageCreatorId)
                                console.log(userId)
                                if (findUser.imageUpVotes.includes(userId)) {
                                    //User has upvoted
                                    ImagePost.findOneAndUpdate({imageKey: imageId}, { $pull: { imageUpVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post UpVote removed",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.imageDownVotes.includes(userId)) {
                                    ImagePost.findOneAndUpdate({imageKey: imageId}, { $pull: { imageDownVotes : userId }}).then(function(){
                                        ImagePost.findOneAndUpdate({imageKey: imageId}, { $push: { imageUpVotes : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Post UpVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else {
                                    ImagePost.findOneAndUpdate({imageKey: imageId}, { $push: { imageUpVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post UpVoted",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        }
                    })
                }
            })
        }
        upVoteImage()
    }
})

//DownVote Image
router.post('/downvoteimage', (req, res) => {
    let {userId, imageId} = req.body;
    //Check Input fields
    if (userId == "" || imageId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function downVoteImage() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    ImagePost.find({imageKey: imageId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            console.log("Bruh")
                            console.log(findUser.imageCreatorId)
                            console.log(userId)
                            if (findUser.imageCreatorId == userId) {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant down vote your own post lol"
                                })
                            } else {
                                console.log(findUser.imageCreatorId)
                                console.log(userId)
                                if (findUser.imageDownVotes.includes(userId)) {
                                    //User has upvoted
                                    ImagePost.findOneAndUpdate({imageKey: imageId}, { $pull: { imageDownVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post DownVote removed",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.imageUpVotes.includes(userId)) {
                                    ImagePost.findOneAndUpdate({imageKey: imageId}, { $pull: { imageUpVotes : userId }}).then(function(){
                                        ImagePost.findOneAndUpdate({imageKey: imageId}, { $push: { imageDownVotes : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Post DownVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else {
                                    ImagePost.findOneAndUpdate({imageKey: imageId}, { $push: { imageDownVotes: userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Post DownVoted",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        }
                    })
                }
            })
        }
        downVoteImage()
    }
})

//search for thread comments
router.get('/getsingleimagecomment/:sentimagekey/:sentuserid/:sentcommentid', (req, res) => {
    let sentImageKey = req.params.sentimagekey
    let sentUserId = req.params.sentuserid
    let sentCommentId = req.params.sentcommentid
    //Check Input fields
    if (sentImageKey == "" || sentUserId == "" || sentCommentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentImageKey)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findImages() {
            await ImagePost.find({imageKey: sentImageKey}).then(data => {
                if (data.length) {
                    var imageComments = data[0].imageComments
                    var nameSendBackObject = [];
                    if (imageComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        function forAwaits(index) {
                            User.find({_id: imageComments[index].commenterId}).then(result => {
                                if (result.length) {
                                    var commentUpVotes = (data[0].imageComments[index].commentUpVotes.length - data[0].imageComments[index].commentDownVotes.length)
                                    var commentUpVoted = false
                                    if (data[0].imageComments[index].commentUpVotes.includes(sentUserId)) {
                                        commentUpVoted = true
                                    }
                                    var commentDownVoted = false
                                    if (data[0].imageComments[index].commentDownVotes.includes(sentUserId)) {
                                        commentDownVoted = true
                                    }
                                    nameSendBackObject.push({commentId: data[0].imageComments[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: data[0].imageComments[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: data[0].imageComments[index].commentDownVotes, commentReplies: data[0].imageComments[index].commentReplies.length, datePosted: data[0].imageComments[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                    sendResponse(nameSendBackObject)
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "Couldn't find user."
                                    })
                                }
                            })
                        }
                        var itemsProcessed  = 0
                        imageComments.forEach(function (item, index) {
                            console.log(imageComments[index].commentId)
                            if (imageComments[index].commentId == sentCommentId) {
                                if (itemsProcessed !== null) {
                                    console.log("Found at index:")
                                    console.log(index)
                                    forAwaits(index)
                                    itemsProcessed = null
                                }
                            } else {
                                if (itemsProcessed !== null) {
                                    itemsProcessed++;
                                    if(itemsProcessed == imageComments.length) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Couldn't find comment."
                                        })
                                    }
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for comments 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for comments 2"
                })
            });
        }
        findImages()
    }
})

//search for thread comments
router.get('/searchforimagecommentreplies/:sentimagekey/:sentuserid/:sentcommentid', (req, res) => {
    let sentImageKey = req.params.sentimagekey
    let sentUserId = req.params.sentuserid
    let sentCommentId = req.params.sentcommentid
    //Check Input fields
    if (sentImageKey == "" || sentUserId == "" || sentCommentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentImageKey)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findImages() {
            await ImagePost.find({imageKey: sentImageKey}).then(data => {
                if (data.length) {
                    var nameSendBackObject = [];
                    var imageComments = data[0].imageComments;
                    if (imageComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        function forAwaits(index) {
                            var itemsProcessed = 0;
                            var commentReplies = data[0].imageComments[index].commentReplies;
                            if (commentReplies.length == 0) {
                                res.json({
                                    status: "FAILED",
                                    message: "No replies"
                                })
                            } else {
                                console.log(commentReplies)
                                commentReplies.forEach(function (item, index) {
                                    User.find({_id: commentReplies[index].commenterId}).then(result => {
                                        if (result.length) {
                                            console.log(data)
                                            console.log(commentReplies[index].commentText)
                                            var commentUpVotes = (commentReplies[index].commentUpVotes.length - commentReplies[index].commentDownVotes.length)
                                            var commentUpVoted = false
                                            if (commentReplies[index].commentUpVotes.includes(sentUserId)) {
                                                commentUpVoted = true
                                            }
                                            var commentDownVoted = false
                                            if (commentReplies[index].commentDownVotes.includes(sentUserId)) {
                                                commentDownVoted = true
                                            }
                                            nameSendBackObject.push({commentId: commentReplies[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: commentReplies[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: commentReplies[index].commentDownVotes, datePosted: commentReplies[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                        } else {
                                            res.json({
                                                status: "FAILED",
                                                message: "An error occured while checking for comment creator"
                                            })
                                        }
                                        itemsProcessed++;
                                        if(itemsProcessed === commentReplies.length) {
                                            console.log("Before Function")
                                            console.log(nameSendBackObject)
                                            sendResponse(nameSendBackObject);
                                        }
                                    })
                                })
                            }
                        }
                        var itemsProcessed = 0
                        imageComments.forEach(function (item, index) {
                            console.log(imageComments[index].commentId)
                            if (imageComments[index].commentId == sentCommentId) {
                                if (itemsProcessed !== null) {
                                    console.log("Found at index:")
                                    console.log(index)
                                    forAwaits(index)
                                    itemsProcessed = null
                                }
                            } else {
                                if (itemsProcessed !== null) {
                                    itemsProcessed++;
                                    if(itemsProcessed == imageComments.length) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Couldn't find comment."
                                        })
                                    }
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for threads 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for threads 2"
                })
            });
        }
        findImages()
    }
})


//CATEGORY AREA

//Create Category
router.post('/postcategorywithimage', upload.single('image'), async (req, res) => {
    let {creatorId, categoryTitle, categoryDescription, categoryTags, categoryNSFW, categoryNSFL, sentAllowScreenShots} = req.body;
    //const file = req.file;
    //console.log(file)
    if (!req.file) {
        console.log("No file recieved.")
        return res.send({
            status: "FAILED",
            message: "No file sent."
        });
    } else {
        console.log('File has been recieved: ', req.file.filename)
        User.find({_id: creatorId}).then(result => {
            if (result.length) {
                Category.find({categoryTitle: {'$regex': `^${categoryTitle}$`, $options: 'i'}}).then(categoryFound => {
                    if (!categoryFound.length) { // category title not already used so allow it
                        if (categoryNSFW == "true") {
                            categoryNSFW=true
                            categoryNSFL = false
                        } else if (categoryNSFL == "true") {
                            categoryNSFL = true
                            categoryNSFW = false
                        } else {
                            categoryNSFW = false
                            categoryNSFL = false
                        }
                        var currentdate = new Date(); 
                        //
                        var twoDigitDate = ''
                        if (currentdate.getDate() < 10) {
                            twoDigitDate = '0' + currentdate.getDate()
                        } else {
                            twoDigitDate = currentdate.getDate()
                        }
                        //
                        var twoDigitMonth = ''
                        var recievedMonth = currentdate.getMonth()+1
                        if (recievedMonth < 10) {
                            twoDigitMonth = '0' + recievedMonth
                        } else {
                            twoDigitMonth = recievedMonth
                        }
                        //
                        var twoDigitHour = ''
                        if (currentdate.getHours() < 10) {
                            twoDigitHour = '0' + currentdate.getHours()
                        } else {
                            twoDigitHour = currentdate.getHours()
                        }
                        //
                        var twoDigitMinutes = ''
                        if (currentdate.getMinutes() < 10) {
                            twoDigitMinutes = '0' + currentdate.getMinutes()
                        } else {
                            twoDigitMinutes = currentdate.getMinutes()
                        }
                        //
                        var twoDigitSeconds = ''
                        if (currentdate.getSeconds() < 10) {
                            twoDigitSeconds = '0' + currentdate.getSeconds()
                        } else {
                            twoDigitSeconds = currentdate.getSeconds()
                        }
                        //
                        var datetime = twoDigitDate + "/"
                        + twoDigitMonth  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + twoDigitHour + ":"  
                        + twoDigitMinutes + ":" 
                        + twoDigitSeconds;
                        //allowScreenShots set up
                        console.log(sentAllowScreenShots)
                        var allowScreenShots = sentAllowScreenShots
                        if (sentAllowScreenShots == true || sentAllowScreenShots == "true") {
                            console.log("sent allow ss was true")
                            allowScreenShots = true
                        } else if (sentAllowScreenShots == false || sentAllowScreenShots == "false") {
                            console.log("sent allow ss was false")
                            allowScreenShots = false
                        } else {    
                            console.log("Sent allow ss wasnt true or false so set true")
                            allowScreenShots = true
                        }
                        console.log(`allowScreenShots ${allowScreenShots}`)

                        const newCategory = new Category({
                            imageKey: req.file.filename,
                            categoryTitle: categoryTitle, 
                            categoryDescription: categoryDescription,
                            categoryTags: categoryTags,
                            members: [creatorId],
                            NSFW: categoryNSFW,
                            NSFL: categoryNSFL,
                            categoryOwnerId: creatorId,
                            categoryOriginalCreator: creatorId,
                            categoryModeratorIds: [],
                            datePosted: datetime,
                            allowScreenShots: allowScreenShots
                        });

                        newCategory.save().then(result => {
                            res.json({
                                status: "SUCCESS",
                                message: "Creation successful",
                            })
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "An error occurred while saving category!"
                            })
                        })
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "A category with this name already exists."
                        })
                    }   
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while getting user data!"
                })
            }
        })
    }
})

//Delete Thread
router.post('/deleteimage', (req, res) => {
    let {userId, imageKey} = req.body;
    console.log(imageKey)
    //Check Input fields
    if (userId == "" || imageKey == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function deleteImage() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    ImagePost.find({imageKey: imageKey}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            if (findUser.imageCreatorId == userId) {
                                ImagePost.deleteOne({imageKey: imageKey}).then(function(){
                                    var filepath = path.resolve(process.env.UPLOADED_PATH, imageKey)
                                    fs.unlink(filepath, function(err){
                                        if (err) {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "An error occured while deleting image post."
                                            })
                                        } else {
                                            console.log("File deleted")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Post was successfully deleted."
                                            })
                                        }
                                    })
                                }).catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error Deleting"
                                    })
                                });
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Error with user"
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Error with thread details"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error with user details"
                    })
                }
            })
        }
        deleteImage()
    }
})

//Create Category
router.post('/postcategorywithoutimage', async (req, res) => {
    let {creatorId, categoryTitle, categoryDescription, categoryTags, categoryNSFW, categoryNSFL, sentAllowScreenShots} = req.body;
    User.find({_id: creatorId}).then(result => {
        if (result.length) {
            Category.find({categoryTitle: {'$regex': `^${categoryTitle}$`, $options: 'i'}}).then(categoryFound => {
                if (!categoryFound.length) { // category title not already used so allow it
                    var currentdate = new Date(); 
                    //
                    var twoDigitDate = ''
                    if (currentdate.getDate() < 10) {
                        twoDigitDate = '0' + currentdate.getDate()
                    } else {
                        twoDigitDate = currentdate.getDate()
                    }
                    //
                    var twoDigitMonth = ''
                    var recievedMonth = currentdate.getMonth()+1
                    if (recievedMonth < 10) {
                        twoDigitMonth = '0' + recievedMonth
                    } else {
                        twoDigitMonth = recievedMonth
                    }
                    //
                    var twoDigitHour = ''
                    if (currentdate.getHours() < 10) {
                        twoDigitHour = '0' + currentdate.getHours()
                    } else {
                        twoDigitHour = currentdate.getHours()
                    }
                    //
                    var twoDigitMinutes = ''
                    if (currentdate.getMinutes() < 10) {
                        twoDigitMinutes = '0' + currentdate.getMinutes()
                    } else {
                        twoDigitMinutes = currentdate.getMinutes()
                    }
                    //
                    var twoDigitSeconds = ''
                    if (currentdate.getSeconds() < 10) {
                        twoDigitSeconds = '0' + currentdate.getSeconds()
                    } else {
                        twoDigitSeconds = currentdate.getSeconds()
                    }
                    //
                    var datetime = twoDigitDate + "/"
                    + twoDigitMonth  + "/" 
                    + currentdate.getFullYear() + " @ "  
                    + twoDigitHour + ":"  
                    + twoDigitMinutes + ":" 
                    + twoDigitSeconds;
                    //allowScreenShots set up
                    console.log(sentAllowScreenShots)
                    var allowScreenShots = sentAllowScreenShots
                    if (sentAllowScreenShots == true) {
                        console.log("sent allow ss was true")
                        allowScreenShots = true
                    } else if (sentAllowScreenShots == false) {
                        console.log("sent allow ss was false")
                        allowScreenShots = false
                    } else {    
                        console.log("Sent allow ss wasnt true or false so set true")
                        allowScreenShots = true
                    }
                    console.log(`allowScreenShots ${allowScreenShots}`)

                    const newCategory = new Category({
                        imageKey: "",
                        categoryTitle: categoryTitle, 
                        categoryDescription: categoryDescription,
                        categoryTags: categoryTags,
                        members: [creatorId],
                        NSFW: categoryNSFW,
                        NSFL: categoryNSFL,
                        categoryOwnerId: creatorId,
                        categoryOriginalCreator: creatorId,
                        categoryModeratorIds: [],
                        datePosted: datetime,
                        allowScreenShots: allowScreenShots
                    });

                    newCategory.save().then(result => {
                        res.json({
                            status: "SUCCESS",
                            message: "Creation successful",
                        })
                    })
                    .catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while saving category!"
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A category with this name already exists."
                    })
                }   
            })
        } else {
            res.json({
                status: "FAILED",
                message: "An error occurred while getting user data!"
            })
        }
    })
})

//search page categories
router.get('/searchpagesearchcategories/:val', (req, res) => {
    let val = req.params.val
    //Check Input fields
    if (val == "") {
        res.json({
            status: "FAILED",
            message: "Search box empty!"
        });
    } else {
        function sendResponse(foundArray) {
            console.log("Params Recieved")
            console.log(foundArray)
            res.json({
                status: "SUCCESS",
                message: "Search successful",
                data: foundArray,
            })
        }
        //Find Category
        console.log(val)
        async function findCategories() {
            var foundArray = []
            await Category.find({categoryTitle: {$regex: `^${val}`, $options: 'i'}}).then(data =>{
                if (data.length) {
                    var itemsProcessed = 0;
                    data.forEach(function (item, index) {
                        foundArray.push({categoryTitle: data[index].categoryTitle, categoryDescription: data[index].categoryDescription, members: data[index].members.length, categoryTags: data[index].categoryTags, imageKey: data[index].imageKey, NSFW: data[index].NSFW, NSFL: data[index].NSFL, datePosted: data[index].datePosted, allowScreenShots: data[index].allowScreenShots})
                        itemsProcessed++;
                        if(itemsProcessed === data.length) {
                            console.log("Before Function")
                            console.log(foundArray)
                            sendResponse(foundArray);
                        }
                    });
                } else {
                    res.json({
                        status: "FAILED",
                        message: "No results"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while searching Error: S2"
                })
            });
        }
        findCategories()
    }
})

//category images
router.get('/getcategoryimage/:val', (req, res) => {
    let val = req.params.val
    //Check Input fields
    if (val == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        Category.find({categoryTitle: val}).then(data =>{
            if (data.length) {
                var categoryData = data[0]
                console.log(categoryData)
                var categoryImageKey = categoryData.imageKey
                console.log(categoryImageKey)
                if (categoryImageKey !== "") {
                    res.json({
                        status: "SUCCESS",
                        message: "Category image found.",
                        data: categoryImageKey
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "No category image."
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Error with getting category!"
                });
            }
        })
    }
})

//search page categories
router.get('/findcategorywithname/:val/:id', (req, res) => {
    let val = req.params.val
    let id = req.params.id
    //Check Input fields
    if (val == "" || id == "") {
        res.json({
            status: "FAILED",
            message: "Search box empty!"
        });
    } else {
        //Find Category
        console.log(val)
        async function findCategories() {
            await Category.find({categoryTitle: val}).then(data =>{
                if (data.length) {
                    var modPerms = false
                    var ownerPerms = false
                    var inCategory = false
                    if (data[0].categoryModeratorIds.includes(id)) {
                        modPerms = true
                        ownerPerms = true
                    }
                    if (data[0].categoryOwnerId == id) {
                        modPerms = true
                        ownerPerms = true
                    }
                    if (data[0].members.includes(id)) {
                        inCategory = true
                    }
                    res.json({
                        status: "SUCCESS",
                        message: "Search successful",
                        data: {categoryTitle: data[0].categoryTitle, categoryDescription: data[0].categoryDescription, members: data[0].members.length, categoryTags: data[0].categoryTags, imageKey: data[0].imageKey, NSFW: data[0].NSFW, NSFL: data[0].NSFL, datePosted: data[0].datePosted, modPerms: modPerms, ownerPerms: ownerPerms, inCategory: inCategory, allowScreenShots: data[0].allowScreenShots}
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured with data passed"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured when searching"
                })
            });
        }
        findCategories()
    }
})

//search find category on user profile page
router.get('/findcategorywithuserid/:id', (req, res) => {
    let id = req.params.id
    //Check Input fields
    if (id == "") {
        res.json({
            status: "FAILED",
            message: "Error with user passed!"
        });
    } else {
        function sendResponse(foundCategories) {
            console.log("Params Recieved")
            console.log(foundCategories)
            res.json({
                status: "SUCCESS",
                message: "Categories search successful",
                data: foundCategories,
            })
        }
        //Find Categories
        var foundCategories = [];
        var itemsProcessed = 0;
        async function findCategories() {
            await Category.find( { members: `${id}` } ).then(data =>{
                if (data.length) {
                    data.forEach(function (item, index) {
                        var inCategory = false
                        if (data[index].members.includes(id)) {
                            inCategory = true
                        }
                        foundCategories.push({categoryTitle: data[index].categoryTitle, categoryDescription: data[index].categoryDescription, members: data[index].members.length, categoryTags: data[index].categoryTags, imageKey: data[index].imageKey, NSFW: data[index].NSFW, NSFL: data[index].NSFL, datePosted: data[index].datePosted, inCategory: inCategory, allowScreenShots: data[0].allowScreenShots})
                        itemsProcessed++;
                        if(itemsProcessed === data.length) {
                            sendResponse(foundCategories);
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured with data passed"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured when searching"
                })
            });
        }
        findCategories()
    }
})

//search page categories
router.get('/findcategoryfromprofile/:pubId/:sentid', (req, res) => {
    let pubId = req.params.pubId
    let sentId = req.params.sentid
    //Check Input fields
    if (sentId == "" || pubId == "") {
        res.json({
            status: "FAILED",
            message: "Error with user passed!"
        });
    } else {
        function sendResponse(foundCategories) {
            console.log("Params Recieved")
            console.log(foundCategories)
            res.json({
                status: "SUCCESS",
                message: "Categories search successful",
                data: foundCategories,
            })
        }
        //Find Categories
        var foundCategories = [];
        var itemsProcessed = 0;
        
        User.find({secondId: pubId}).then(result => {
            if (result.length) {
                User.find({_id: sentId}).then(userRequestingCategories => {
                    if (userRequestingCategories.length && !result[0].blockedAccounts.includes(userRequestingCategories[0].secondId)) {
                        async function findCategories() {
                            var profilesId = result[0]._id
                            console.log("profilesId:")
                            console.log(profilesId)
                            await Category.find( { "members": `${profilesId}` } ).then(data =>{
                                console.log("Found categories")
                                console.log(data)
                                if (data.length) {
                                    data.forEach(function (item, index) {
                                        var inCategory = false
                                        if (data[index].members.includes(sentId)) {
                                            inCategory = true
                                        }
                                        foundCategories.push({categoryTitle: data[index].categoryTitle, categoryDescription: data[index].categoryDescription, members: data[index].members.length, categoryTags: data[index].categoryTags, imageKey: data[index].imageKey, NSFW: data[index].NSFW, NSFL: data[index].NSFL, datePosted: data[index].datePosted, inCategory: inCategory, allowScreenShots: data[index].allowScreenShots})
                                        itemsProcessed++;
                                        if(itemsProcessed === data.length) {
                                            sendResponse(foundCategories);
                                        }
                                    })
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "No categories found"
                                    })
                                }
                            })
                            .catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "An error occured when searching"
                                })
                            });
                        }
                        findCategories()
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "User not found."
                        })
                    }
                }).catch(error => {
                    console.log(error)
                    console.log('An error occured while finding user with ID: ' + sentId)
                    res.json({
                        status: "FAILED",
                        message: "Error while finding user."
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Error with User Passed"
                })
            }
        })
    }
})

router.post('/joincategory', (req, res) => {
    let {userId, categoryTitle} = req.body;
    User.find({_id: userId}).then(result => {
        if (result.length) {
            Category.find({categoryTitle: categoryTitle}).then(data => {
                if (data.length) {
                    if (data[0].members.includes(userId)) {
                        Category.findOneAndUpdate({categoryTitle: categoryTitle}, { $pull: { members : userId }}).then(function(){
                            console.log("SUCCESS1")
                            res.json({
                                status: "SUCCESS",
                                message: "Left Category",
                            })
                        })
                    } else {
                        //Not in the category yet
                        Category.findOneAndUpdate({categoryTitle: categoryTitle}, { $push: { members : userId }}).then(function(){
                            console.log("SUCCESS1")
                            res.json({
                                status: "SUCCESS",
                                message: "Joined Category",
                            })
                        })
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error with data passed",
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Error with data passed",
            })
        }
    })
})

//THREAD AREA

//Create Thread
router.post('/posttextthread', (req, res) => {
    let {creatorId, threadTitle, threadSubtitle, threadTags, threadCategory, threadBody, threadNSFW, threadNSFL, sentAllowScreenShots} = req.body;
    threadBody = threadBody.trim();
    threadTitle = threadTitle.trim();
    threadSubtitle = threadSubtitle.trim();
    threadTags = threadTags.trim();
    User.find({_id: creatorId}).then(result => {
        if (result.length) {
            Category.find({categoryTitle: threadCategory}).then(data => {
                if (data.length) {
                    var currentdate = new Date(); 
                    //
                    var twoDigitDate = ''
                    if (currentdate.getDate() < 10) {
                        twoDigitDate = '0' + currentdate.getDate()
                    } else {
                        twoDigitDate = currentdate.getDate()
                    }
                    //
                    var twoDigitMonth = ''
                    var recievedMonth = currentdate.getMonth()+1
                    if (recievedMonth < 10) {
                        twoDigitMonth = '0' + recievedMonth
                    } else {
                        twoDigitMonth = recievedMonth
                    }
                    //
                    var twoDigitHour = ''
                    if (currentdate.getHours() < 10) {
                        twoDigitHour = '0' + currentdate.getHours()
                    } else {
                        twoDigitHour = currentdate.getHours()
                    }
                    //
                    var twoDigitMinutes = ''
                    if (currentdate.getMinutes() < 10) {
                        twoDigitMinutes = '0' + currentdate.getMinutes()
                    } else {
                        twoDigitMinutes = currentdate.getMinutes()
                    }
                    //
                    var twoDigitSeconds = ''
                    if (currentdate.getSeconds() < 10) {
                        twoDigitSeconds = '0' + currentdate.getSeconds()
                    } else {
                        twoDigitSeconds = currentdate.getSeconds()
                    }
                    //
                    var datetime = twoDigitDate + "/"
                    + twoDigitMonth  + "/" 
                    + currentdate.getFullYear() + " @ "  
                    + twoDigitHour + ":"  
                    + twoDigitMinutes + ":" 
                    + twoDigitSeconds;
                    //allowScreenShots set up
                    var allowScreenShots = sentAllowScreenShots // just an intial value
                    if (data[0].allowScreenShots !== false) {
                        console.log(sentAllowScreenShots)
                        var allowScreenShots = sentAllowScreenShots
                        if (sentAllowScreenShots == true) {
                            console.log("sent allow ss was true")
                            allowScreenShots = true
                        } else if (sentAllowScreenShots == false) {
                            console.log("sent allow ss was false")
                            allowScreenShots = false
                        } else {    
                            console.log("Sent allow ss wasnt true or false so set true")
                            allowScreenShots = true
                        }
                    } else {
                        allowScreenShots = false
                    }
                    console.log(`allowScreenShots ${allowScreenShots}`)
                    const newThread = new Thread({
                        threadType: "Text",
                        threadComments: [],
                        threadUpVotes: [],
                        threadDownVotes: [],
                        creatorId: creatorId,
                        threadTitle: threadTitle,
                        threadSubtitle: threadSubtitle,
                        threadTags: threadTags,
                        threadCategory: threadCategory,
                        threadBody: threadBody,
                        threadImageKey: "",
                        threadImageDescription: "",
                        threadNSFW: threadNSFW,
                        threadNSFL: threadNSFL,
                        datePosted: datetime,
                        allowScreenShots: allowScreenShots
                    });

                    newThread.save().then(result => {
                        res.json({
                            status: "SUCCESS",
                            message: "Creation successful",
                        })
                    })
                    .catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while saving category!"
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "No category found!"
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "An error occurred while getting user data!"
            })
        }
    })
})

//Post Image
router.post('/postimagethread', upload.single('image'), async (req, res) => {
    let {creatorId, threadTitle, threadSubtitle, threadTags, threadCategory, threadImageDescription, threadNSFW, threadNSFL, sentAllowScreenShots} = req.body;
    //const file = req.file;
    if (!req.file) {
        console.log("No file recieved.")
        return res.send({
            status: "FAILED",
            message: "No file sent."
        });
    } else {
        console.log('File has been recieved: ', req.file.filename)
        console.log(creatorId)
        User.find({_id: creatorId}).then(result => {
            if (result.length) {
                Category.find({categoryTitle: threadCategory}).then(data => {
                    if (data.length) {
                        var currentdate = new Date(); 
                        //
                        var twoDigitDate = ''
                        if (currentdate.getDate() < 10) {
                            twoDigitDate = '0' + currentdate.getDate()
                        } else {
                            twoDigitDate = currentdate.getDate()
                        }
                        //
                        var twoDigitMonth = ''
                        var recievedMonth = currentdate.getMonth()+1
                        if (recievedMonth < 10) {
                            twoDigitMonth = '0' + recievedMonth
                        } else {
                            twoDigitMonth = recievedMonth
                        }
                        //
                        var twoDigitHour = ''
                        if (currentdate.getHours() < 10) {
                            twoDigitHour = '0' + currentdate.getHours()
                        } else {
                            twoDigitHour = currentdate.getHours()
                        }
                        //
                        var twoDigitMinutes = ''
                        if (currentdate.getMinutes() < 10) {
                            twoDigitMinutes = '0' + currentdate.getMinutes()
                        } else {
                            twoDigitMinutes = currentdate.getMinutes()
                        }
                        //
                        var twoDigitSeconds = ''
                        if (currentdate.getSeconds() < 10) {
                            twoDigitSeconds = '0' + currentdate.getSeconds()
                        } else {
                            twoDigitSeconds = currentdate.getSeconds()
                        }
                        //
                        var datetime = twoDigitDate + "/"
                        + twoDigitMonth  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + twoDigitHour + ":"  
                        + twoDigitMinutes + ":" 
                        + twoDigitSeconds;
                        //allowScreenShots set up
                        var allowScreenShots = sentAllowScreenShots // just an intial value
                        if (data[0].allowScreenShots !== false) {
                            console.log(sentAllowScreenShots)
                            var allowScreenShots = sentAllowScreenShots
                            if (sentAllowScreenShots == true) {
                                console.log("sent allow ss was true")
                                allowScreenShots = true
                            } else if (sentAllowScreenShots == false) {
                                console.log("sent allow ss was false")
                                allowScreenShots = false
                            } else {    
                                console.log("Sent allow ss wasnt true or false so set true")
                                allowScreenShots = true
                            }
                        } else {
                            allowScreenShots = false
                        }
                        console.log(`allowScreenShots ${allowScreenShots}`)
                        const newThread = new Thread({
                            threadType: "Images",
                            threadComments: [],
                            threadUpVotes: [],
                            threadDownVotes: [],
                            creatorId: creatorId,
                            threadTitle: threadTitle,
                            threadSubtitle: threadSubtitle,
                            threadTags: threadTags,
                            threadCategory: threadCategory,
                            threadBody: "",
                            threadImageKey: req.file.filename,
                            threadImageDescription: threadImageDescription,
                            threadNSFW: threadNSFW,
                            threadNSFL: threadNSFL,
                            datePosted: datetime,
                            allowScreenShots: allowScreenShots
                        });

                        newThread.save().then(result => {
                            res.json({
                                status: "SUCCESS",
                                message: "Creation successful",
                            })
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "An error occurred while saving category!"
                            })
                        })
                    }
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while getting user data!"
                })
            }
        })
    }
})

//Get Threads From Category
router.get('/getthreadsfromcategory/:categorytitle/:userid', (req, res) => {
    let categorytitle = req.params.categorytitle
    let userid = req.params.userid
    console.log("yes")
    console.log(userid)
    Category.find({categoryTitle: categorytitle}).then(data =>{ 
        if (data.length) {
            Thread.find({threadCategory: categorytitle}).then(result => {
                if (result.length) {
                    var allThreads = []
                    var itemsProcessed = 0;
                    result.forEach(function (item, index) {
                        User.find({_id: result[index].creatorId}).then(data => {
                            if (data.length) {
                                console.log(result)
                                var threadType = result[index].threadType
                                var threadComments = result[index].threadComments.length
                                var threadUpVotes = (result[index].threadUpVotes.length - result[index].threadDownVotes.length)
                                var threadTitle =  result[index].threadTitle
                                var threadSubtitle = result[index].threadSubtitle
                                var threadTags = result[index].threadTags
                                var threadCategory = result[index].threadCategory
                                var threadBody = result[index].threadBody
                                var threadImageKey = result[index].threadImageKey
                                var threadImageDescription = result[index].threadImageDescription
                                var threadNSFW = result[index].threadNSFW
                                var threadNSFL = result[index].threadNSFL
                                var datePosted = result[index].datePosted
                                var creatorDisplayName = data[0].displayName
                                var creatorName = data[0].name
                                var creatorImageKey = data[0].profileImageKey
                                var allowScreenShots = result[index].allowScreenShots
                                var threadUpVoted = false
                                var threadDownVoted = false
                                if (result[index].threadUpVotes.includes(userid)) {
                                    console.log("Up voted")
                                    threadUpVoted = true
                                    allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                                    itemsProcessed++;
                                    if(itemsProcessed === result.length) {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Posts found",
                                            data: allThreads
                                        })
                                    }
                                } else if (result[index].threadDownVotes.includes(userid)) {
                                    console.log("Down voted")
                                    threadDownVoted = true
                                    allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                                    itemsProcessed++;
                                    if(itemsProcessed === result.length) {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Posts found",
                                            data: allThreads
                                        })
                                    }
                                } else {
                                    allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                                    itemsProcessed++;
                                    if(itemsProcessed === result.length) {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Posts found",
                                            data: allThreads
                                        })
                                    }
                                }
                            } else {
                                console.log("A user does not exist but the thread does.")
                                console.log(result[index].creatorId)
                            }
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "This user has no thread posts!"
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "An error occurred while getting user data!"
            })
        }
    })
})

//Get Threads From profile
router.get('/getthreadsfromprofilewithid/:userid', (req, res) => {
    let userid = req.params.userid
    console.log(userid)

    Thread.find({creatorId: userid}).then(result => {
        if (result.length) {
            var allThreads = []
            var itemsProcessed = 0;
            result.forEach(function (item, index) {
                User.find({_id: result[index].creatorId}).then(data => {
                    if (data.length) {
                        console.log(result)
                        var threadType = result[index].threadType
                        var threadComments = result[index].threadComments.length
                        var threadUpVotes = (result[index].threadUpVotes.length - result[index].threadDownVotes.length)
                        var threadTitle =  result[index].threadTitle
                        var threadSubtitle = result[index].threadSubtitle
                        var threadTags = result[index].threadTags
                        var threadCategory = result[index].threadCategory
                        var threadBody = result[index].threadBody
                        var threadImageKey = result[index].threadImageKey
                        var threadImageDescription = result[index].threadImageDescription
                        var threadNSFW = result[index].threadNSFW
                        var threadNSFL = result[index].threadNSFL
                        var datePosted = result[index].datePosted
                        var creatorDisplayName = data[0].displayName
                        var creatorName = data[0].name
                        var creatorImageKey = data[0].profileImageKey
                        var allowScreenShots = result[index].allowScreenShots
                        var threadUpVoted = false
                        var threadDownVoted = false
                        if (result[index].threadUpVotes.includes(userid)) {
                            console.log("Up voted")
                            threadUpVoted = true
                            allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                            itemsProcessed++;
                            if(itemsProcessed === result.length) {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Posts found",
                                    data: allThreads
                                })
                            }
                        } else if (result[index].threadDownVotes.includes(userid)) {
                            console.log("Down voted")
                            threadDownVoted = true
                            allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                            itemsProcessed++;
                            if(itemsProcessed === result.length) {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Posts found",
                                    data: allThreads
                                })
                            }
                        } else {
                            allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                            itemsProcessed++;
                            if(itemsProcessed === result.length) {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Posts found",
                                    data: allThreads
                                })
                            }
                        }
                    } else {
                        console.log("A user does not exist but the thread does.")
                        console.log(result[index].creatorId)
                    }
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "This user has no thread posts!"
            })
        }
    })
})

//Get Threads From profile
router.get('/getthreadsfromprofile/:pubId/:sentuserid', (req, res) => {
    let pubId = req.params.pubId
    let sentuserid = req.params.sentuserid
    console.log(pubId)
    User.find({secondId: pubId}).then(userResult => {
        if (userResult.length) {
            User.find({_id: sentuserid}).then(userRequestingThreads => {
                if (userRequestingThreads.length && !userResult[0].blockedAccounts.includes(userRequestingThreads[0].secondId)) {
                    var userid = userResult[0]._id
                    console.log("user id:")
                    console.log(userid)
                    Thread.find({creatorId: userid}).then(result => {
                        if (result.length) {
                            var allThreads = []
                            var itemsProcessed = 0;
                            result.forEach(function (item, index) {
                                User.find({_id: result[index].creatorId}).then(data => {
                                    if (data.length) {
                                        console.log(result)
                                        var threadType = result[index].threadType
                                        var threadComments = result[index].threadComments.length
                                        var threadUpVotes = (result[index].threadUpVotes.length - result[index].threadDownVotes.length)
                                        var threadTitle =  result[index].threadTitle
                                        var threadSubtitle = result[index].threadSubtitle
                                        var threadTags = result[index].threadTags
                                        var threadCategory = result[index].threadCategory
                                        var threadBody = result[index].threadBody
                                        var threadImageKey = result[index].threadImageKey
                                        var threadImageDescription = result[index].threadImageDescription
                                        var threadNSFW = result[index].threadNSFW
                                        var threadNSFL = result[index].threadNSFL
                                        var datePosted = result[index].datePosted
                                        var creatorDisplayName = data[0].displayName
                                        var creatorName = data[0].name
                                        var creatorImageKey = data[0].profileImageKey
                                        var allowScreenShots = result[index].allowScreenShots
                                        var threadUpVoted = false
                                        var threadDownVoted = false
                                        if (result[index].threadUpVotes.includes(sentuserid)) {
                                            console.log("Up voted")
                                            threadUpVoted = true
                                            allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                                            itemsProcessed++;
                                            if(itemsProcessed === result.length) {
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Posts found",
                                                    data: allThreads
                                                })
                                            }
                                        } else if (result[index].threadDownVotes.includes(sentuserid)) {
                                            console.log("Down voted")
                                            threadDownVoted = true
                                            allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                                            itemsProcessed++;
                                            if(itemsProcessed === result.length) {
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Posts found",
                                                    data: allThreads
                                                })
                                            }
                                        } else {
                                            allThreads.push({threadId: result[index]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, allowScreenShots: allowScreenShots})
                                            itemsProcessed++;
                                            if(itemsProcessed === result.length) {
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Posts found",
                                                    data: allThreads
                                                })
                                            }
                                        }
                                    } else {
                                        console.log("A user does not exist but the thread does.")
                                        console.log(result[index].creatorId)
                                    }
                                })
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "This user has no thread posts!"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "User not found."
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Error with user provided"
            })
        }
    }).catch(err => {
        res.json({
            status: "FAILED",
            message: "Error with user provided"
        })
    })
})

//UpVote Thread
router.post('/upvotethread', (req, res) => {
    let {userId, threadId} = req.body;
    //Check Input fields
    if (userId == "" || threadId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function upVoteThread() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Thread.find({_id: threadId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            console.log("Bruh")
                            console.log(findUser.creatorId)
                            console.log(userId)
                            if (findUser.creatorId == userId) {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant up vote your own post lol"
                                })
                            } else {
                                console.log(findUser.creatorId)
                                console.log(userId)
                                if (findUser.threadUpVotes.includes(userId)) {
                                    //User has upvoted
                                    Thread.findOneAndUpdate({_id: threadId}, { $pull: { threadUpVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Thread UpVote removed",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.threadDownVotes.includes(userId)) {
                                    Thread.findOneAndUpdate({_id: threadId}, { $pull: { threadDownVotes: userId }}).then(function(){
                                        Thread.findOneAndUpdate({_id: threadId}, { $push: { threadUpVotes: userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Thread UpVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else {
                                    Thread.findOneAndUpdate({_id: threadId}, { $push: { threadUpVotes: userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Thread UpVoted",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        }
                    })
                }
            })
        }
        upVoteThread()
    }
})

//DownVote Thread
router.post('/downvotethread', (req, res) => {
    let {userId, threadId} = req.body;
    //Check Input fields
    if (userId == "" || threadId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function downVoteThread() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Thread.find({_id: threadId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            console.log(findUser)
                            console.log("Bruh")
                            console.log(findUser.creatorId)
                            console.log(userId)
                            if (findUser.creatorId == userId) {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant down vote your own post lol"
                                })
                            } else {
                                console.log(findUser.threadCreatorId)
                                console.log(userId)
                                if (findUser.threadDownVotes.includes(userId)) {
                                    //User has upvoted
                                    Thread.findOneAndUpdate({_id: threadId}, { $pull: { threadDownVotes : userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Thread DownVote removed",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else if (findUser.threadUpVotes.includes(userId)) {
                                    Thread.findOneAndUpdate({_id: threadId}, { $pull: { threadUpVotes : userId }}).then(function(){
                                        Thread.findOneAndUpdate({_id: threadId}, { $push: { threadDownVotes : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Thread DownVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error pulling"
                                        })
                                    });
                                } else {
                                    Thread.findOneAndUpdate({_id: threadId}, { $push: { threadDownVotes: userId }}).then(function(){
                                        console.log("SUCCESS1")
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Thread DownVoted",
                                        })
                                    })
                                    .catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error updating"
                                        })
                                    });
                                }
                            }
                        }
                    })
                }
            })
        }
        downVoteThread()
    }
})

//Poll Comment Post
router.post('/threadpostcomment', (req, res) => {
    let {comment, userName, userId, threadId} = req.body;
    comment = comment.trim();
    //Check Input fields
    if (comment == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].name == userName) {
                    async function findThreads() {
                        var currentdate = new Date(); 
                        //
                        var twoDigitDate = ''
                        if (currentdate.getDate() < 10) {
                            twoDigitDate = '0' + currentdate.getDate()
                        } else {
                            twoDigitDate = currentdate.getDate()
                        }
                        //
                        var twoDigitMonth = ''
                        var recievedMonth = currentdate.getMonth()+1
                        if (recievedMonth < 10) {
                            twoDigitMonth = '0' + recievedMonth
                        } else {
                            twoDigitMonth = recievedMonth
                        }
                        //
                        var twoDigitHour = ''
                        if (currentdate.getHours() < 10) {
                            twoDigitHour = '0' + currentdate.getHours()
                        } else {
                            twoDigitHour = currentdate.getHours()
                        }
                        //
                        var twoDigitMinutes = ''
                        if (currentdate.getMinutes() < 10) {
                            twoDigitMinutes = '0' + currentdate.getMinutes()
                        } else {
                            twoDigitMinutes = currentdate.getMinutes()
                        }
                        //
                        var twoDigitSeconds = ''
                        if (currentdate.getSeconds() < 10) {
                            twoDigitSeconds = '0' + currentdate.getSeconds()
                        } else {
                            twoDigitSeconds = currentdate.getSeconds()
                        }
                        //
                        var datetime = twoDigitDate + "/"
                        + twoDigitMonth  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + twoDigitHour + ":"  
                        + twoDigitMinutes + ":" 
                        + twoDigitSeconds;
                        var objectId = new mongodb.ObjectID()
                        console.log(objectId)
                        var commentForPost = {commentId: objectId, commenterId: userId, commentsText: comment, commentUpVotes: [], commentDownVotes: [], commentReplies: [], datePosted: datetime}
                        Thread.findOneAndUpdate({_id: threadId}, { $push: { threadComments: commentForPost } }).then(function(){
                            console.log("SUCCESS1")
                            res.json({
                                status: "SUCCESS",
                                message: "Comment upload successful",
                            })
                        })
                        .catch(err => {
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "Error updating"
                            })
                        });
                    }
                    findThreads()
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A name based error occured"
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "An id based error occured"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//Thread Comment Reply Post
router.post('/threadpostcommentreply', (req, res) => {
    let {comment, userName, userId, threadId, commentId} = req.body;
    comment = comment.trim();
    //Check Input fields
    if (comment == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        User.find({_id: userId}).then(result => {
            if (result.length) {
                if (result[0].name == userName) {
                    Thread.find({_id: threadId}).then(data => {
                        if (data.length) {
                            var threadComments = data[0].threadComments
                            async function findThreads(sentIndex) {
                                var currentdate = new Date(); 
                                //
                                var twoDigitDate = ''
                                if (currentdate.getDate() < 10) {
                                    twoDigitDate = '0' + currentdate.getDate()
                                } else {
                                    twoDigitDate = currentdate.getDate()
                                }
                                //
                                var twoDigitMonth = ''
                                var recievedMonth = currentdate.getMonth()+1
                                if (recievedMonth < 10) {
                                    twoDigitMonth = '0' + recievedMonth
                                } else {
                                    twoDigitMonth = recievedMonth
                                }
                                //
                                var twoDigitHour = ''
                                if (currentdate.getHours() < 10) {
                                    twoDigitHour = '0' + currentdate.getHours()
                                } else {
                                    twoDigitHour = currentdate.getHours()
                                }
                                //
                                var twoDigitMinutes = ''
                                if (currentdate.getMinutes() < 10) {
                                    twoDigitMinutes = '0' + currentdate.getMinutes()
                                } else {
                                    twoDigitMinutes = currentdate.getMinutes()
                                }
                                //
                                var twoDigitSeconds = ''
                                if (currentdate.getSeconds() < 10) {
                                    twoDigitSeconds = '0' + currentdate.getSeconds()
                                } else {
                                    twoDigitSeconds = currentdate.getSeconds()
                                }
                                //
                                var datetime = twoDigitDate + "/"
                                + twoDigitMonth  + "/" 
                                + currentdate.getFullYear() + " @ "  
                                + twoDigitHour + ":"  
                                + twoDigitMinutes + ":" 
                                + twoDigitSeconds;
                                var objectId = new mongodb.ObjectID()
                                console.log(objectId)
                                var commentForPost = {commentId: objectId, commenterId: userId, commentsText: comment, commentUpVotes: [], commentDownVotes: [], datePosted: datetime}
                                Thread.findOneAndUpdate({_id: threadId}, { $push: { [`threadComments.${sentIndex}.commentReplies`]: commentForPost } }).then(function(){
                                    console.log("SUCCESS1")
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Comment upload successful",
                                    })
                                })
                                .catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error updating"
                                    })
                                });
                            }
                            var itemsProcessed = 0
                            threadComments.forEach(function (item, index) {
                                console.log(threadComments[index].commentId)
                                console.log(commentId)
                                if (threadComments[index].commentId == commentId) {
                                    if (itemsProcessed !== null) {
                                        console.log("Found at index:")
                                        console.log(index)
                                        findThreads(index)
                                        itemsProcessed = null
                                    }
                                } else {
                                    if (itemsProcessed !== null) {
                                        itemsProcessed++;
                                        if(itemsProcessed == threadComments.length) {
                                            res.json({
                                                status: "FAILED",
                                                message: "Couldn't find comment."
                                            })
                                        }
                                    }
                                }
                            });
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "A thread based error occured"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "A name based error occured"
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "An id based error occured"
                })
            } 
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "An error occured while checking for userS"
            })
        });
    }
})

//search for thread comments
router.get('/searchforthreadcomments/:sentthreadid/:sentuserid', (req, res) => {
    let sentThreadId = req.params.sentthreadid
    let sentUserId = req.params.sentuserid
    //Check Input fields
    if (sentThreadId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentThreadId)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findThreads() {
            await Thread.find({_id: sentThreadId}).then(data => {
                if (data.length) {
                    var nameSendBackObject = [];
                    var threadComments = data[0].threadComments;
                    if (threadComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        var itemsProcessed = 0;
                        console.log(threadComments)
                        threadComments.forEach(function (item, index) {
                            User.find({_id: threadComments[index].commenterId}).then(result => {
                                if (result.length) {
                                    console.log(data)
                                    console.log(data[0].threadComments[index].commentText)
                                    var commentUpVotes = (data[0].threadComments[index].commentUpVotes.length - data[0].threadComments[index].commentDownVotes.length)
                                    var commentUpVoted = false
                                    if (data[0].threadComments[index].commentUpVotes.includes(sentUserId)) {
                                        commentUpVoted = true
                                    }
                                    var commentDownVoted = false
                                    if (data[0].threadComments[index].commentDownVotes.includes(sentUserId)) {
                                        commentDownVoted = true
                                    }
                                    nameSendBackObject.push({commentId: data[0].threadComments[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: data[0].threadComments[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: data[0].threadComments[index].commentDownVotes, commentReplies: data[0].threadComments[index].commentReplies.length, datePosted: data[0].threadComments[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occured while checking for comment creator"
                                    })
                                }
                                itemsProcessed++;
                                if(itemsProcessed === threadComments.length) {
                                    console.log("Before Function")
                                    console.log(nameSendBackObject)
                                    sendResponse(nameSendBackObject);
                                }
                            })
                        })
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for threads 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for threads 2"
                })
            });
        }
        findThreads()
    }
})

//search for thread comments
router.get('/getsinglethreadcomment/:sentthreadid/:sentuserid/:sentcommentid', (req, res) => {
    let sentThreadId = req.params.sentthreadid
    let sentUserId = req.params.sentuserid
    let sentCommentId = req.params.sentcommentid
    //Check Input fields
    if (sentThreadId == "" || sentUserId == "" || sentCommentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentThreadId)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findThreads() {
            await Thread.find({_id: sentThreadId}).then(data => {
                if (data.length) {
                    var threadComments = data[0].threadComments
                    var nameSendBackObject = [];
                    if (threadComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        function forAwaits(index) {
                            User.find({_id: threadComments[index].commenterId}).then(result => {
                                if (result.length) {
                                    var commentUpVotes = (data[0].threadComments[index].commentUpVotes.length - data[0].threadComments[index].commentDownVotes.length)
                                    var commentUpVoted = false
                                    if (data[0].threadComments[index].commentUpVotes.includes(sentUserId)) {
                                        commentUpVoted = true
                                    }
                                    var commentDownVoted = false
                                    if (data[0].threadComments[index].commentDownVotes.includes(sentUserId)) {
                                        commentDownVoted = true
                                    }
                                    nameSendBackObject.push({commentId: data[0].threadComments[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: data[0].threadComments[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: data[0].threadComments[index].commentDownVotes, commentReplies: data[0].threadComments[index].commentReplies.length, datePosted: data[0].threadComments[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                    sendResponse(nameSendBackObject)
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "Couldn't find user."
                                    })
                                }
                            })
                        }
                        var itemsProcessed  = 0
                        threadComments.forEach(function (item, index) {
                            console.log(threadComments[index].commentId)
                            if (threadComments[index].commentId == sentCommentId) {
                                if (itemsProcessed !== null) {
                                    console.log("Found at index:")
                                    console.log(index)
                                    forAwaits(index)
                                    itemsProcessed = null
                                }
                            } else {
                                if (itemsProcessed !== null) {
                                    itemsProcessed++;
                                    if(itemsProcessed == threadComments.length) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Couldn't find comment."
                                        })
                                    }
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for threads 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for threads 2"
                })
            });
        }
        findThreads()
    }
})

//search for thread comments
router.get('/searchforthreadcommentreplies/:sentthreadid/:sentuserid/:sentcommentid', (req, res) => {
    let sentThreadId = req.params.sentthreadid
    let sentUserId = req.params.sentuserid
    let sentCommentId = req.params.sentcommentid
    //Check Input fields
    if (sentThreadId == "" || sentUserId == "" || sentCommentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        console.log(sentThreadId)
        function sendResponse(nameSendBackObject) {
            console.log("Params Recieved")
            console.log(nameSendBackObject)
            res.json({
                status: "SUCCESS",
                message: "Comment search successful",
                data: nameSendBackObject,
            })
        }
        async function findThreads() {
            await Thread.find({_id: sentThreadId}).then(data => {
                if (data.length) {
                    var nameSendBackObject = [];
                    var threadComments = data[0].threadComments;
                    if (threadComments.length == 0) {
                        res.json({
                            status: "FAILED",
                            message: "No comments"
                        })
                    } else {
                        function forAwaits(index) {
                            var itemsProcessed = 0;
                            var commentReplies = data[0].threadComments[index].commentReplies;
                            if (commentReplies.length == 0) {
                                res.json({
                                    status: "FAILED",
                                    message: "No replies"
                                })
                            } else {
                                console.log(commentReplies)
                                commentReplies.forEach(function (item, index) {
                                    User.find({_id: commentReplies[index].commenterId}).then(result => {
                                        if (result.length) {
                                            console.log(data)
                                            console.log(commentReplies[index].commentText)
                                            var commentUpVotes = (commentReplies[index].commentUpVotes.length - commentReplies[index].commentDownVotes.length)
                                            var commentUpVoted = false
                                            if (commentReplies[index].commentUpVotes.includes(sentUserId)) {
                                                commentUpVoted = true
                                            }
                                            var commentDownVoted = false
                                            if (commentReplies[index].commentDownVotes.includes(sentUserId)) {
                                                commentDownVoted = true
                                            }
                                            nameSendBackObject.push({commentId: commentReplies[index].commentId, commenterName: result[0].name, commenterDisplayName: result[0].displayName, commentText: commentReplies[index].commentsText, commentUpVotes: commentUpVotes, commentDownVotes: commentReplies[index].commentDownVotes, datePosted: commentReplies[index].datePosted, profileImageKey: result[0].profileImageKey, commentUpVoted: commentUpVoted, commentDownVoted: commentDownVoted})
                                        } else {
                                            res.json({
                                                status: "FAILED",
                                                message: "An error occured while checking for comment creator"
                                            })
                                        }
                                        itemsProcessed++;
                                        if(itemsProcessed === commentReplies.length) {
                                            console.log("Before Function")
                                            console.log(nameSendBackObject)
                                            sendResponse(nameSendBackObject);
                                        }
                                    })
                                })
                            }
                        }
                        var itemsProcessed = 0
                        threadComments.forEach(function (item, index) {
                            console.log(threadComments[index].commentId)
                            if (threadComments[index].commentId == sentCommentId) {
                                if (itemsProcessed !== null) {
                                    console.log("Found at index:")
                                    console.log(index)
                                    forAwaits(index)
                                    itemsProcessed = null
                                }
                            } else {
                                if (itemsProcessed !== null) {
                                    itemsProcessed++;
                                    if(itemsProcessed == threadComments.length) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Couldn't find comment."
                                        })
                                    }
                                }
                            }
                        });
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while checking for threads 1"
                    })
                }
            })
            .catch(err => {
                console.log(err)
                res.json({
                    status: "FAILED",
                    message: "An error occured while checking for threads 2"
                })
            });
        }
        findThreads()
    }
})

//Get Threads With Id
router.get('/getthreadbyid/:threadid/:userid', (req, res) => {
    let threadId = req.params.threadid
    let userid = req.params.userid
    console.log(userid)
    Thread.find({_id: threadId}).then(result => {
        if (result.length) {
            Category.find({categoryTitle: result[0].threadCategory}).then(data =>{ 
                if (data.length) {
                    var categoryImageKey = data[0].imageKey
                    if (data[0].imageKey == "") {
                        categoryImageKey = null
                    }
                    var allThreads = []
                    User.find({_id: result[0].creatorId}).then(data => {
                        if (data.length) {
                            var threadType = result[0].threadType
                            var threadComments = result[0].threadComments.length
                            var threadUpVotes = (result[0].threadUpVotes.length - result[0].threadDownVotes.length)
                            var threadTitle =  result[0].threadTitle
                            var threadSubtitle = result[0].threadSubtitle
                            var threadTags = result[0].threadTags
                            var threadCategory = result[0].threadCategory
                            var threadBody = result[0].threadBody
                            var threadImageKey = result[0].threadImageKey
                            var threadImageDescription = result[0].threadImageDescription
                            var threadNSFW = result[0].threadNSFW
                            var threadNSFL = result[0].threadNSFL
                            var datePosted = result[0].datePosted
                            var allowScreenShots = result[0].allowScreenShots
                            var threadUpVoted = false
                            if (result[0].threadUpVotes.includes(userid)) {
                                threadUpVoted = true
                            }
                            var threadDownVoted = false
                            if (result[0].threadDownVotes.includes(userid)) {
                                threadDownVoted = true
                            }
                            var creatorDisplayName = data[0].displayName
                            var creatorName = data[0].name
                            var creatorImageKey = data[0].profileImageKey
                            allThreads.push({threadId: result[0]._id, threadComments: threadComments, threadType: threadType, threadUpVotes: threadUpVotes, threadTitle: threadTitle, threadSubtitle: threadSubtitle, threadTags: threadTags, threadCategory: threadCategory, threadBody: threadBody, threadImageKey: threadImageKey, threadImageDescription: threadImageDescription, threadNSFW: threadNSFW, threadNSFL: threadNSFL, datePosted: datePosted, threadUpVoted: threadUpVoted, threadDownVoted: threadDownVoted, creatorDisplayName: creatorDisplayName, creatorName: creatorName, creatorImageKey: creatorImageKey, categoryImageKey: categoryImageKey, allowScreenShots: allowScreenShots})
                            res.json({
                                status: "SUCCESS",
                                message: "Posts found",
                                data: allThreads
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Thread exists but user does not? TBI-Error 1"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Category could not be found? TBI-Error 2"
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Thread post could not be found? TBI-Error 3"
            })
        }
    })
})

//Delete Thread
router.post('/deletethread', (req, res) => {
    let {userId, threadId} = req.body;
    //Check Input fields
    if (userId == "" || threadId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function deleteThread() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    Thread.find({_id: threadId}).then(data => {
                        if (data.length) {
                            var findUser = data[0]
                            if (findUser.creatorId == userId) {
                                if (findUser.threadType !== "Images") {
                                    Thread.deleteOne({_id: findUser._id}).then(function(){
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Deleted"
                                        });
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error Deleting"
                                        })
                                    });
                                } else {
                                    Thread.deleteOne({_id: findUser._id}).then(function(){
                                        let filepath = path.resolve(process.env.UPLOADED_PATH, findUser.threadImageKey);
                                        fs.unlink(filepath, (err) => {
                                            if (err) {
                                                console.log('An error occured while deleting thread image with key: ' + findUser.threadImageKey)
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error Deleting"
                                                })
                                            } else {
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Deleted"
                                                });
                                            }
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error Deleting"
                                        })
                                    });
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Error with user"
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Error with thread details"
                            })
                        }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error with user details"
                    })
                }
            })
        }
        deleteThread()
    }
})

//UpVote Thread
router.post('/upvotecomment', (req, res) => {
    let {format, userId, postId, commentId} = req.body;
    //Check Input fields
    if (format == ""  || userId == "" || postId == "" || commentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function upVoteComment() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    if (format == "Poll") {
                        Poll.find({_id: postId}).then(data => {
                            if (data.length) {
                                var findUser = data[0]
                                console.log(findUser)
                                console.log("Bruh")
                                console.log(findUser.creatorId)
                                console.log(userId)
                                async function forAwaits(sentIndex) { 
                                    console.log(findUser.creatorId)
                                    console.log(userId)
                                    if (findUser.pollComments[sentIndex].commentUpVotes.includes(userId)) {
                                        //User has upvoted
                                        Poll.findOneAndUpdate({_id: postId}, { $pull: { [`pollComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment UpVote removed",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else if (findUser.pollComments[sentIndex].commentDownVotes.includes(userId)) {
                                        Poll.findOneAndUpdate({_id: postId}, { $pull: { [`pollComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            Poll.findOneAndUpdate({_id: postId}, { $push: { [`pollComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Comment UpVoted",
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else {
                                        Poll.findOneAndUpdate({_id: postId}, { $push: { [`pollComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment UpVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    }
                                }
                                var itemsProcessed = 0
                                findUser.pollComments.forEach(function (item, index) {
                                    console.log(findUser.pollComments[index].commentId)
                                    console.log(commentId)
                                    if (findUser.pollComments[index].commentId == commentId) {
                                        if (itemsProcessed !== null) {
                                            console.log("Found at index:")
                                            console.log(index)
                                            forAwaits(index)
                                            itemsProcessed = null
                                        }
                                    } else {
                                        if (itemsProcessed !== null) {
                                            itemsProcessed++;
                                            if(itemsProcessed == findUser.pollComments.length) {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Couldn't find comment."
                                                })
                                            }
                                        }
                                    }
                                });
                            }
                        })
                    } else if (format == "Image") {
                        ImagePost.find({_id: postId}).then(data => {
                            if (data.length) {
                                var findUser = data[0]
                                console.log(findUser)
                                console.log("Bruh")
                                console.log(findUser.creatorId)
                                console.log(userId)
                                async function forAwaits(sentIndex) { 
                                    console.log(findUser.creatorId)
                                    console.log(userId)
                                    if (findUser.imageComments[sentIndex].commentUpVotes.includes(userId)) {
                                        //User has upvoted
                                        ImagePost.findOneAndUpdate({_id: postId}, { $pull: { [`imageComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment UpVote removed",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else if (findUser.imageComments[sentIndex].commentDownVotes.includes(userId)) {
                                        ImagePost.findOneAndUpdate({_id: postId}, { $pull: { [`imageComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            ImagePost.findOneAndUpdate({_id: postId}, { $push: { [`imageComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Comment UpVoted",
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else {
                                        ImagePost.findOneAndUpdate({_id: postId}, { $push: { [`imageComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment UpVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    }
                                }
                                var itemsProcessed = 0
                                findUser.imageComments.forEach(function (item, index) {
                                    console.log(findUser.imageComments[index].commentId)
                                    console.log(commentId)
                                    if (findUser.imageComments[index].commentId == commentId) {
                                        if (itemsProcessed !== null) {
                                            console.log("Found at index:")
                                            console.log(index)
                                            forAwaits(index)
                                            itemsProcessed = null
                                        }
                                    } else {
                                        if (itemsProcessed !== null) {
                                            itemsProcessed++;
                                            if(itemsProcessed == findUser.imageComments.length) {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Couldn't find comment."
                                                })
                                            }
                                        }
                                    }
                                });
                            }
                        })
                    } else if (format == "Thread") {
                        Thread.find({_id: postId}).then(data => {
                            if (data.length) {
                                var findUser = data[0]
                                console.log(findUser)
                                console.log("Bruh")
                                console.log(findUser.creatorId)
                                console.log(userId)
                                async function forAwaits(sentIndex) { 
                                    console.log(findUser.creatorId)
                                    console.log(userId)
                                    if (findUser.threadComments[sentIndex].commentUpVotes.includes(userId)) {
                                        //User has upvoted
                                        Thread.findOneAndUpdate({_id: postId}, { $pull: { [`threadComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment UpVote removed",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else if (findUser.threadComments[sentIndex].commentDownVotes.includes(userId)) {
                                        Thread.findOneAndUpdate({_id: postId}, { $pull: { [`threadComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            Thread.findOneAndUpdate({_id: postId}, { $push: { [`threadComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Comment UpVoted",
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else {
                                        Thread.findOneAndUpdate({_id: postId}, { $push: { [`threadComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment UpVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    }
                                }
                                var itemsProcessed = 0
                                findUser.threadComments.forEach(function (item, index) {
                                    console.log(findUser.threadComments[index].commentId)
                                    console.log(commentId)
                                    if (findUser.threadComments[index].commentId == commentId) {
                                        if (itemsProcessed !== null) {
                                            console.log("Found at index:")
                                            console.log(index)
                                            forAwaits(index)
                                            itemsProcessed = null
                                        }
                                    } else {
                                        if (itemsProcessed !== null) {
                                            itemsProcessed++;
                                            if(itemsProcessed == findUser.threadComments.length) {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Couldn't find comment."
                                                })
                                            }
                                        }
                                    }
                                });
                            }
                        })
                    }
                }
            })
        }
        upVoteComment()
    }
})

//DownVote Thread
router.post('/downvotecomment', (req, res) => {
    let {format, userId, postId, commentId} = req.body;
    //Check Input fields
    if (format == ""  || userId == "" || postId == "" || commentId == "") {
        res.json({
            status: "FAILED",
            message: "Error with data passed!"
        });
    } else {
        //Find User
        async function downVoteComment() {
            //Confirm User
            User.find({_id: userId}).then(result => {
                if (result.length) {
                    //User exists
                    if (format == "Poll") {
                        Poll.find({_id: postId}).then(data => {
                            if (data.length) {
                                var findUser = data[0]
                                console.log(findUser)
                                console.log("Bruh")
                                console.log(findUser.creatorId)
                                console.log(userId)
                                async function forAwaits(sentIndex) { 
                                    console.log(findUser.creatorId)
                                    console.log(userId)
                                    if (findUser.pollComments[sentIndex].commentDownVotes.includes(userId)) {
                                        //User has upvoted
                                        Poll.findOneAndUpdate({_id: postId}, { $pull: { [`pollComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment DownVote removed",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else if (findUser.pollComments[sentIndex].commentUpVotes.includes(userId)) {
                                        Poll.findOneAndUpdate({_id: postId}, { $pull: { [`pollComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            Poll.findOneAndUpdate({_id: postId}, { $push: { [`pollComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Comment DownVoted",
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else {
                                        Poll.findOneAndUpdate({_id: postId}, { $push: { [`pollComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment DownVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    }
                                }
                                var itemsProcessed = 0
                                findUser.pollComments.forEach(function (item, index) {
                                    console.log(findUser.pollComments[index].commentId)
                                    console.log(commentId)
                                    if (findUser.pollComments[index].commentId == commentId) {
                                        if (itemsProcessed !== null) {
                                            console.log("Found at index:")
                                            console.log(index)
                                            forAwaits(index)
                                            itemsProcessed = null
                                        }
                                    } else {
                                        if (itemsProcessed !== null) {
                                            itemsProcessed++;
                                            if(itemsProcessed == findUser.pollComments.length) {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Couldn't find comment."
                                                })
                                            }
                                        }
                                    }
                                });
                            }
                        })
                    } else if (format == "Image") {
                        ImagePost.find({_id: postId}).then(data => {
                            if (data.length) {
                                var findUser = data[0]
                                console.log(findUser)
                                console.log("Bruh")
                                console.log(findUser.creatorId)
                                console.log(userId)
                                async function forAwaits(sentIndex) { 
                                    console.log(findUser.creatorId)
                                    console.log(userId)
                                    if (findUser.imageComments[sentIndex].commentDownVotes.includes(userId)) {
                                        //User has upvoted
                                        ImagePost.findOneAndUpdate({_id: postId}, { $pull: { [`imageComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment DownVote removed",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else if (findUser.imageComments[sentIndex].commentUpVotes.includes(userId)) {
                                        ImagePost.findOneAndUpdate({_id: postId}, { $pull: { [`imageComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            ImagePost.findOneAndUpdate({_id: postId}, { $push: { [`imageComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Comment DownVoted",
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else {
                                        ImagePost.findOneAndUpdate({_id: postId}, { $push: { [`imageComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment DownVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    }
                                }
                                var itemsProcessed = 0
                                findUser.imageComments.forEach(function (item, index) {
                                    console.log(findUser.imageComments[index].commentId)
                                    console.log(commentId)
                                    if (findUser.imageComments[index].commentId == commentId) {
                                        if (itemsProcessed !== null) {
                                            console.log("Found at index:")
                                            console.log(index)
                                            forAwaits(index)
                                            itemsProcessed = null
                                        }
                                    } else {
                                        if (itemsProcessed !== null) {
                                            itemsProcessed++;
                                            if(itemsProcessed == findUser.imageComments.length) {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Couldn't find comment."
                                                })
                                            }
                                        }
                                    }
                                });
                            }
                        })
                    } else if (format == "Thread") {
                        Thread.find({_id: postId}).then(data => {
                            if (data.length) {
                                var findUser = data[0]
                                console.log(findUser)
                                console.log("Bruh")
                                console.log(findUser.creatorId)
                                console.log(userId)
                                async function forAwaits(sentIndex) { 
                                    console.log(findUser.creatorId)
                                    console.log(userId)
                                    if (findUser.threadComments[sentIndex].commentDownVotes.includes(userId)) {
                                        //User has upvoted
                                        Thread.findOneAndUpdate({_id: postId}, { $pull: { [`threadComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment DownVote removed",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else if (findUser.threadComments[sentIndex].commentUpVotes.includes(userId)) {
                                        Thread.findOneAndUpdate({_id: postId}, { $pull: { [`threadComments.${sentIndex}.commentUpVotes`] : userId }}).then(function(){
                                            Thread.findOneAndUpdate({_id: postId}, { $push: { [`threadComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                                console.log("SUCCESS1")
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Comment DownVoted",
                                                })
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error updating"
                                                })
                                            });
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error pulling"
                                            })
                                        });
                                    } else {
                                        Thread.findOneAndUpdate({_id: postId}, { $push: { [`threadComments.${sentIndex}.commentDownVotes`] : userId }}).then(function(){
                                            console.log("SUCCESS1")
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Comment DownVoted",
                                            })
                                        })
                                        .catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating"
                                            })
                                        });
                                    }
                                }
                                var itemsProcessed = 0
                                findUser.threadComments.forEach(function (item, index) {
                                    console.log(findUser.threadComments[index].commentId)
                                    console.log(commentId)
                                    if (findUser.threadComments[index].commentId == commentId) {
                                        if (itemsProcessed !== null) {
                                            console.log("Found at index:")
                                            console.log(index)
                                            forAwaits(index)
                                            itemsProcessed = null
                                        }
                                    } else {
                                        if (itemsProcessed !== null) {
                                            itemsProcessed++;
                                            if(itemsProcessed == findUser.threadComments.length) {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Couldn't find comment."
                                                })
                                            }
                                        }
                                    }
                                });
                            }
                        })
                    }
                }
            })
        }
        downVoteComment()
    }
})

router.post('/toggleFollowOfAUser', (req, res) => { // need to add auth and come up with a way to prevent bots
    let {userId, userToFollowPubId} = req.body;
    //Check for userId validity and get user for their pub Id
    User.find({_id: userId}).then(userFollowingFound => {
        if (userFollowingFound.length) {
            //Check for other user for validity and to make sure they exist
            User.find({secondId: userToFollowPubId}).then(userGettingFollowed => {
                if (userGettingFollowed[0].blockedAccounts.includes(userFollowingFound[0].secondId)) {
                    res.json({
                        status: "FAILED",
                        message: "User not found."
                    })
                } else {
                    if (userGettingFollowed.length) {
                        if (userGettingFollowed[0].privateAccount == true) {
                            if (userGettingFollowed[0].followers.includes(userFollowingFound[0].secondId)) {
                                //UnFollow private account
                                User.findOneAndUpdate({_id: userGettingFollowed[0]._id}, { $pull : {followers: userFollowingFound[0].secondId}}).then(function() {
                                    User.findOneAndUpdate({_id: userId}, { $pull : {following: userGettingFollowed[0].secondId}}).then(function() {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "UnFollowed User"
                                        })
                                    }).catch(err => {
                                        console.log(`Error updating ${err}`)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error while updating user getting followed."
                                        })
                                    })
                                }).catch(err => {
                                    console.log(`Error updating: ${err}`)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error while updating user getting followed."
                                    })
                                })
                            } else {
                                if (!userGettingFollowed[0].accountFollowRequests.includes(userFollowingFound[0].secondId)) {
                                    //Request to follow the account
                                    User.findOneAndUpdate({_id: userGettingFollowed[0]._id}, {$push: {accountFollowRequests: userFollowingFound[0].secondId}}).then(function() {
                                        var notifMessage = {
                                            title: "New Follow Request",
                                            body: userFollowingFound[0].name + " has requested to follow you."
                                        }
                                        var notifData = {
                                            type: "Follow request",
                                            pubIdOfFollower: userFollowingFound[0].secondId
                                        }
                                        sendNotifications(userGettingFollowed[0]._id, notifMessage, notifData)
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Requested To Follow User"
                                        })
                                    }).catch(err => {
                                        console.log(`Error updating ${err}`)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error while updating user getting follow requested."
                                        })
                                    })
                                } else {
                                    //Remove request to follow the account
                                    User.findOneAndUpdate({_id: userGettingFollowed[0]._id}, {$pull: {accountFollowRequests: userFollowingFound[0].secondId}}).then(function() {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Removed Request To Follow User"
                                        })
                                    }).catch(err => {
                                        console.log(`Error updating ${err}`)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error while updating user losing a follow request."
                                        })
                                    })
                                }
                            }
                        } else {
                            if (!userGettingFollowed[0].followers.includes(userFollowingFound[0].secondId)) {
                                //Follow
                                User.findOneAndUpdate({_id: userGettingFollowed[0]._id}, { $push : {followers: userFollowingFound[0].secondId}}).then(function() {
                                    User.findOneAndUpdate({_id: userId}, { $push : {following: userGettingFollowed[0].secondId}}).then(function() {
                                        var notifMessage = {
                                            title: "New Follower",
                                            body: userFollowingFound[0].name + " has followed you."
                                        }
                                        var notifData = {
                                            type: "Follow",
                                            pubIdOfFollower: userFollowingFound[0].secondId
                                        }
                                        sendNotifications(userGettingFollowed[0]._id, notifMessage, notifData)
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Followed User"
                                        })
                                    }).catch(err => {
                                        console.log(`Error updating ${err}`)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error while updating user getting followed."
                                        })
                                    })
                                }).catch(err => {
                                    console.log(`Error updating: ${err}`)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error while updating user getting followed."
                                    })
                                })
                            } else {
                                //UnFollow
                                User.findOneAndUpdate({_id: userGettingFollowed[0]._id}, { $pull : {followers: userFollowingFound[0].secondId}}).then(function() {
                                    User.findOneAndUpdate({_id: userId}, { $pull : {following: userGettingFollowed[0].secondId}}).then(function() {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "UnFollowed User"
                                        })
                                    }).catch(err => {
                                        console.log(`Error updating ${err}`)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error while updating user getting followed."
                                        })
                                    })
                                }).catch(err => {
                                    console.log(`Error updating: ${err}`)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error while updating user getting followed."
                                    })
                                })
                            }
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find user to follow, this is likely due to a bad passed public id of the user you are following."
                        })
                    }
                }
            }).catch(err => {
                console.log(`Error following user ${err}`)
                res.json({
                    status: "FAILED",
                    message: "Issue find user to follow, this may be due to a bad passed public id of the user you are following."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Coudln't find user, this is likely due to bad passed id from your account."
            })
        }
    }).catch(err => {
        console.log(`Error following user: ${err}`)
        res.json({
            status: "FAILED",
            message: "Issue with finding user, this could be due to a bad passed id from your account."
        })
    })
})


router.get('/reloadUsersDetails/:usersPubId/:userSearchingPubId', (req, res) => {
    let usersPubId = req.params.usersPubId
    let userSearchingPubId = req.params.userSearchingPubId
    User.find({secondId: usersPubId}).then(userData => {
        if (userData.length) {
            //could do a user search ig but no need really
            if (userData[0].blockedAccounts.includes(userSearchingPubId)) {
                res.json({
                    status: "FAILED",
                    message: "User not found."
                })
            } else {
                if (userData[0].privateAccount == true) {
                    if (userData[0].accountFollowRequests.includes(userSearchingPubId)) {
                        //User has requested to follow this account
                        res.json({
                            status: "SUCCESS",
                            message: "Found",
                            data: {name: userData[0].name, displayName: userData[0].name, followers: userData[0].followers.length, following: userData[0].following.length, totalLikes: userData[0].totalLikes, profileKey: userData[0].profileImageKey, badges: userData[0].badges, userIsFollowing: 'Requested'}
                        })
                    } else {
                        //User has not requested to follow this private account
                        if (userData[0].followers.includes(userSearchingPubId)) {
                            // User is following this account
                            res.json({
                                status: "SUCCESS",
                                message: "Found",
                                data: {name: userData[0].name, displayName: userData[0].name, followers: userData[0].followers.length, following: userData[0].following.length, totalLikes: userData[0].totalLikes, profileKey: userData[0].profileImageKey, badges: userData[0].badges, userIsFollowing: true}
                            })
                        } else {
                            //User is not following this private account
                            res.json({
                                status: "SUCCESS",
                                message: "Found",
                                data: {name: userData[0].name, displayName: userData[0].name, followers: userData[0].followers.length, following: userData[0].following.length, totalLikes: userData[0].totalLikes, profileKey: userData[0].profileImageKey, badges: userData[0].badges, userIsFollowing: false}
                            })
                        }
                    }
                } else {
                    if (userData[0].followers.includes(userSearchingPubId)) {
                        res.json({
                            status: "SUCCESS",
                            message: "Found",
                            data: {name: userData[0].name, displayName: userData[0].name, followers: userData[0].followers.length, following: userData[0].following.length, totalLikes: userData[0].totalLikes, profileKey: userData[0].profileImageKey, badges: userData[0].badges, userIsFollowing: true}
                        })
                    } else {
                        res.json({
                            status: "SUCCESS",
                            message: "Found",
                            data: {name: userData[0].name, displayName: userData[0].name, followers: userData[0].followers.length, following: userData[0].following.length, totalLikes: userData[0].totalLikes, profileKey: userData[0].profileImageKey, badges: userData[0].badges, userIsFollowing: false}
                        })
                    }    
                }      
            }
        } else {
            res.json({
                status: "FAILED",
                message: "Couldn't find user."
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error finding user."
        })
    })
})

router.post('/earnSpecialBadge', (req, res) => {
    let {userId, badgeEarnt} = req.body;
    
    //Check if an actual special badge was passed
    if (badgeEarnt == "homeScreenLogoPressEasterEgg") { // Will add more badges here when we make more
        User.find({_id: userId}).then(userFound => {
            if (userFound.length) {
                //User found
                if (userFound[0].badges.includes(badgeEarnt)) {
                    //Badge already earnt
                    res.json({
                        status: "FAILED",
                        message: "Badge already earnt."
                    })
                } else {
                    //Badge not earnt
                    const twoDigitDate = generateTwoDigitDate()
                    User.findOneAndUpdate({_id: userId}, { $push : {badges: {badgeName: badgeEarnt, dateRecieved: twoDigitDate}}}).then(function() {
                        res.json({
                            status: "SUCCESS",
                            message: "Badge earnt."
                        })
                    }).catch(err => {
                        console.log(`Error updating ${err}`)
                        res.json({
                            status: "FAILED",
                            message: "Error while updating user data."
                        })
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Couldn't find user."
                })
            }
        }).catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Error finding user."
            })
        })
    } else {
        res.json({
            status: "FAILED",
            message: "Wrong badge was given."
        })
    }
})

router.get('/getuserbyid/:userID', (req, res) => {
    let {userID} = req.params;
    userID = userID.toString().trim();
    User.find({secondId: userID}).then(userFound => {
        if (userFound.length) {
            const dataToSend = {displayName: userFound[0].displayName, name: userFound[0].name, profileImageKey: userFound[0].profileImageKey, pubId: userID, privateAccount: userFound[0].privateAccount};
            res.json({
                status: "SUCCESS",
                message: "User found.",
                data: dataToSend
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.log(error)
        res.json({
            status: "FAILED",
            message: "Error finding user. Please try again."
        })
    })  
})

router.post('/makeaccountprivate', (req, res) => {
    let {userID} = req.body
    userID = userID.toString().trim()
    User.find({_id: userID}).then((userFound) => {
        if (userFound.length) {
            // User exists
            User.findOneAndUpdate({_id: userID}, {privateAccount: true}).then(function() {
                res.json({
                    status: "SUCCESS",
                    message: "Account is now private."
                })
            }).catch((error) => {
                console.log('Error occured while making user private')
                console.log('User ID: ' + userID)
                console.log(error)
                res.json({
                    status: "FAILED",
                    message: "Error occured while making account private."
                })
            })
        } else {
            // User does not exist
            res.json({
                status: "FAILED",
                message: "Account not found."
            })
        }
    }).catch((error) => {
        console.log('Error finding account')
        console.log(error)
        res.json({
            status: "FAILED",
            message: "An error occured while finding account"
        })
    })
})

router.post('/makeaccountpublic', (req, res) => {
    let {userID} = req.body;
    userID = userID.toString().trim();

    const makeAccountPublic = () => {
        User.findOneAndUpdate({_id: userID}, {privateAccount: false}).then(function() {
            res.json({
                status: "SUCCESS",
                message: "Account is now public."
            })
        }).catch((error) => {
            console.log('An error occured while making account with ID: ' + userID + ' public.')
        })
    };

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            //User found
            const userData = userFound[0];
            const accountsRequestingToFollow = userData.accountFollowRequests
            if (accountsRequestingToFollow.length) {
                User.findOneAndUpdate({_id: userID}, {$push: {followers: {$each: accountsRequestingToFollow}}}).then(function() {
                    User.findOneAndUpdate({_id: userID}, {accountFollowRequests: []}).then(function() {
                        makeAccountPublic()
                    }).catch((error) => {
                        console.log('An error occured while clearing accounts requesting to follow account with ID: ' + userID + ' array.')
                        console.log(error)
                        res.json({
                            status: "FAILED",
                            message: "An error occured while clearing account follow requests array. Please try again."
                        })
                    })
                }).catch((error) => {
                    console.log('An error occured while getting users requesting to follow account with ID: ' + userID + ' to follow the account.')
                    console.log(error)
                    res.json({
                        status: "FAILED",
                        message: "Error occured while getting users with follow requests to follow you. Please try again."
                    })
                })
            } else {
                makeAccountPublic()
            }
        } else {
            //User not found
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch((error) => {
        console.log('Error occured while finding user with ID: ' + userID + ' while making their account public.')
        console.log(error)
        res.json({
            status: "FAILED",
            message: "An error occured while finding account"
        })
    })
})

router.get('/getfollowrequests/:userID', (req, res) => {
    let userID = req.params.userID;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            res.json({
                status: "SUCCESS",
                message: "Found user",
                data: userFound[0].accountFollowRequests
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Cannot find user"
            })
        }
    }).catch(err => {
        console.log('Error while getting user info with user ID: ' + userID)
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error occured while finding user"
        })
    })
})

router.post('/denyfollowrequest', (req, res) => {
    let {accountFollowRequestedID, accountFollowRequestDeniedPubID} = req.body;
    accountFollowRequestedID = accountFollowRequestedID.toString().trim();

    User.find({_id: accountFollowRequestedID}).then(userFound => {
        if (userFound.length) {
            if (userFound[0].accountFollowRequests.includes(accountFollowRequestDeniedPubID)) {
                User.findOneAndUpdate({_id: accountFollowRequestedID}, {$pull: {accountFollowRequests: accountFollowRequestDeniedPubID}}).then(function() {
                    res.json({
                        status: "SUCCESS",
                        message: "Request denied."
                    })
                }).catch(err => {
                    console.log('An error occured while denying request to follow user with ID: ' + accountFollowRequestedID + '. Request was made from user with ID: ' + accountFollowRequestDeniedPubID)
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "An error occured while denying the follow request."
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Follow request not found."
                })
            }
        } else {
            res.json({
                status: "FAILED",
                message: "User not found"
            })
        }
    }).catch(err => {
        console.log('Error finding user with ID: ' + accountFollowRequestedID);
        console.log(err)
        res.json({
            status: "FAILED",
            message: "An error occured while finding the user."
        })
    })
})

router.post('/acceptfollowrequest', (req, res) => {
    let {accountFollowRequestedID, accountFollowRequestAcceptedPubID} = req.body;
    accountFollowRequestedID = accountFollowRequestedID.toString().trim()

    User.find({_id: accountFollowRequestedID}).then(userFound => {
        if (userFound.length) {
            if (userFound[0].accountFollowRequests.includes(accountFollowRequestAcceptedPubID)) {
                User.findOneAndUpdate({_id: accountFollowRequestedID}, {$push: {followers: accountFollowRequestAcceptedPubID}}).then(function() {
                    User.findOneAndUpdate({_id: accountFollowRequestedID}, {$pull: {accountFollowRequests: accountFollowRequestAcceptedPubID}}).then(function() {
                        User.findOneAndUpdate({secondId: accountFollowRequestAcceptedPubID}, {$push: {following: userFound[0].secondId}}).then(function() {
                            res.json({
                                status: "SUCCESS",
                                message: 'Follow request accepted.'
                            })
                        }).catch(err => {
                            console.log('Error while getting user with ID: ' + accountFollowRequestedAcceptedID + ' to follow user with ID: ' + accountFollowRequestedID + ' after they accepted a follow request.')
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "An error occured while accepting follow request."
                            })
                        })
                    }).catch(err => {
                        console.log('Error while getting rid of user with ID: ' + accountFollowRequestAcceptedPubID + ' from account follow requests array from user with ID: ' + accountFollowRequestedID)
                        console.log(err)
                        res.json({
                            status: "FAILED",
                            message: "An error occured while accepting follow request."
                        })
                    })
                }).catch(err => {
                    console.log('An error occured while getting user with ID: ' + accountFollowRequestAcceptedPubID + ' to follow user with ID: ' + accountFollowRequestedID + ' after they accepted their follow request.')
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: 'An error occured while accepting follow request.'
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Follow request not found."
                })
            }
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(err => {
        console.log('Error finding user with ID: ' + accountFollowRequestedID);
        console.log(err)
        res.json({
            status: "FAILED",
            message: "An error occured while finding the user."
        })
    })
})

router.post('/removefollowerfromaccount', (req, res) => {
    let {userID, userToRemovePubId} = req.body;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            User.find({secondId: userToRemovePubId}).then(userToRemoveFound => {
                if (userToRemoveFound.length) {
                    User.findOneAndUpdate({_id: userID}, {$pull: {followers: userToRemovePubId}}).then(function() {
                        User.findOneAndUpdate({secondId: userToRemovePubId}, {$pull: {following: userFound[0].secondId}}).then(function() {
                            res.json({
                                status: "SUCCESS",
                                message: "Follower has been removed."
                            })
                        }).catch(error => {
                            console.log(error)
                            console.log('An error occured while pulling user with secondId: ' + userFound[0].secondId + ' from following array from user with secondId: ' + userToRemovePubId)
                            res.json({
                                status: "FAILED",
                                message: "An error occured while removing follower. Please try again."
                            })
                        })
                    }).catch(error => {
                        console.log(error)
                        console.log('An error occured while pulling user with secondId: ' + userToRemovePubId + ' from following array of user with ID: ' + userID)
                        res.json({
                            status: "FAILED",
                            message: "An error occured while removing follower. Please try again."
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Cannot find user."
                    })
                }
            }).catch(error => {
                console.log(error)
                console.log('Error finding user with public ID: ' + userToRemovePubId)
                res.json({
                    status: "FAILED",
                    message: "An error occured while finding the user. Please try again."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Cannot find user"
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('Error finding user with ID: ' + userID);
        res.json({
            status: "FAILED",
            message: "An error occured while finding the user. Please try again."
        })
    })
})

router.post('/blockaccount', (req, res) => {
    let {userID, userToBlockPubId} = req.body;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            User.find({secondId: userToBlockPubId}).then(userToBlockFound => {
                if (userToBlockFound.length) {
                    User.findOneAndUpdate({_id: userID}, {$pull: {followers: userToBlockPubId}}).then(function() {
                        User.findOneAndUpdate({secondId: userToBlockPubId}, {$pull: {following: userFound[0].secondId}}).then(function() {
                            if (userFound[0].blockedAccounts.includes(userToBlockPubId)) {
                                //User already blocked
                                res.json({
                                    status: "SUCCESS",
                                    message: "User is already blocked"
                                })
                            } else {
                                User.findOneAndUpdate({_id: userID}, {$push: {blockedAccounts: userToBlockPubId}}).then(function() {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Blocked user."
                                    })
                                }).catch(error => {
                                    console.log(error)
                                    console.log('An error occured while adding user with public ID: ' + userToBlockPubId + ' to blockedAccounts array of user with ID: ' + userID)
                                })
                            }
                        }).catch(error => {
                            console.log(error)
                            console.log('An error occured while removing user with public ID: ' + userFound[0].secondId + ' from following array of user with public ID: ' + userToBlockPubId)
                            res.json({
                                status: "FAILED",
                                message: "An error occured while blocking user. Please try again later."
                            })
                        })
                    }).catch(error => {
                        console.log(error)
                        console.log('An error occured while removing user with public ID: ' + userToBlockPubId + ' from followers array of user with ID: ' + userID)
                        res.json({
                            status: "FAILED",
                            message: "An error occured while blocking user. Please try again later."
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Cannot find user. Possibly due to a bad public ID passed."
                    })
                }
            }).catch(error => {
                console.log(error)
                console.log('Error occured while finding user with secondId: ' + userToBlockPubId)
                res.json({
                    status: "FAILED",
                    message: "An error occured while finding user."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Cannot find user. Possibly due to a bad ID passed."
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('Error occured while finding user with ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured while finding user."
        })
    })
})

router.get('/getuserblockedaccounts/:userID', (req, res) => {
    let {userID} = req.params;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            res.json({
                status: "SUCCESS",
                message: "Found blocked accounts",
                data: userFound[0].blockedAccounts
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Couldn't find user. Possibly due to a bad ID passed."
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('An error occured while finding user with ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured. Please try again later."
        })
    })
})

router.post('/unblockaccount', (req, res) => {
    let {userID, userToUnblockPubId} = req.body;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            User.find({secondId: userToUnblockPubId}).then(userToUnblockFound => {
                if (userToUnblockFound.length) {
                    User.findOneAndUpdate({_id: userID}, {$pull: {blockedAccounts: userToUnblockPubId}}).then(function() {
                        res.json({
                            status: "SUCCESS",
                            message: "User has been unblocked."
                        })
                    }).catch(error => {
                        console.log(error)
                        console.log('An error occured while getting rid of user with public ID: ' + userToUnblockPubId + ' from blocked accounts array from user with ID: ' + userID)
                        res.json({
                            status: "FAILED",
                            message: "An error occured while updating user. Please try again."
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "CAnnot find user"
                    })
                }
            }).catch(error => {
                console.log(error)
                console.log('Cannot find user with public ID' + userToUnblockPubId)
                res.json({
                    status: "FAILED",
                    message: "An error occured while finding user."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Cannot find user."
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('Cannot fins uer with ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured while finding the user."
        })
    })
})

router.post('/enableAlgorithm', (req, res) => {
    let {userID} = req.body;
    userID = userID.toString().trim()

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            let newSettings = userFound[0].settings;
            newSettings.algorithmSettings.enabled = true;
            User.findOneAndUpdate({_id: userID}, {settings: newSettings}).then(function() {
                res.json({
                    status: "SUCCESS",
                    message: "Algorithm has now been enabled."
                })
            }).catch(error => {
                console.log(error)
                console.log('Error while setting algorithmEnabled to true for user with ID: ' + userID)
                res.json({
                    status: "FAILED",
                    message: "An error occured while turning on the algorithm."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('Error with finding user with ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured while finding user."
        })
    })
})

router.get('/getAuthenticationFactorsEnabled/:userID', (req, res) => {
    let {userID} = req.params;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            res.json({
                status: "SUCCESS",
                message: "Authentication factors found.",
                data: {authenticationFactorsEnabled: userFound[0].authenticationFactorsEnabled, MFAEmail: userFound[0].MFAEmail ? blurEmailFunction(userFound[0].MFAEmail) : null}
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('An error occured while finding user with ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured while finding the user. Please try again later."
        })
    })
})

router.post('/disableAlgorithm', (req, res) => {
    let {userID} = req.body;
    userID = userID.toString().trim()

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            let newSettings = userFound[0].settings;
            newSettings.algorithmSettings.enabled = false;
            User.findOneAndUpdate({_id: userID}, {settings: newSettings}).then(function() {
                res.json({
                    status: "SUCCESS",
                    message: "Algorithm has now been disabled."
                })
            }).catch(error => {
                console.log(error)
                console.log('Error while setting algorithmEnabled to false for user with ID: ' + userID)
                res.json({
                    status: "FAILED",
                    message: "An error occured while turning off the algorithm."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.log(error)
        console.log('Error with finding user with ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured while finding user."
        })
    })
})

router.get('/reloadProfileEssentials/:userId', (req, res) => {
    let userId = req.params.userId

    User.find({_id: userId}).then(userFound => {
        if (userFound.length) {
            let sendBackForReload = userFound[0];
            //list should include everything that we dont pass back
            ['secondId', 'password', 'notificationKeys'].forEach(x => delete sendBackForReload[x])
            res.json({
                status: "SUCCESS",
                message: "Reload Information Successful.",
                data: sendBackForReload
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Could not find user."
            })
        }
    }).catch(err => {
        console.log('Error reloading profile essentials: ' + err)
        res.json({
            status: "FAILED",
            message: "Error finding user."
        })
    })
})

router.post('/turnOffEmailMultiFactorAuthentication', (req, res) => {
    let {userID} = req.body;
    userID = userID.toString().trim();

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            User.findOneAndUpdate({_id: userID}, {$pull: {authenticationFactorsEnabled: 'Email'}}).then(function() {
                User.findOneAndUpdate({_id: userID}, {MFAEmail: undefined}).then(function() {
                    res.json({
                        status: "SUCCESS",
                        message: "Email multi-factor authentication has been turned off successfully."
                    })

                    var emailData = {
                        from: process.env.SMTP_EMAIL,
                        to: userFound[0].email,
                        subject: "Email Multi-Factor Authentication Turned Off",
                        text: `Email Multi-Factor authentication has now been turned off for your account. If you did not request for this to happen, someone else may be logged into your account. If so, change your password immediately.`,
                        html: `<p>Email Multi-Factor authentication has now been turned off for your account. If you did not request for this to happen, someone else may be logged into your account. If so, change your password immediately.</p>`
                    };

                    mailTransporter.sendMail(emailData, function(error, response) {
                        if (error) {
                            console.error('An error occured while sending an email to user with ID: ' + userID)
                        }
                    })
                }).catch(error => {
                    console.log(error)
                    console.log("An error occured while setting MFAEmail to undefined for user with ID: " + userID)
                    res.json({
                        status: "FAILED",
                        message: "An error occured whilwe turning off email multi-factor authentication."
                    })
                })
            }).catch(error => {
                console.log(error)
                console.log("An error occured while removing Email from the authenticationFactorsEnabled array for user with ID: " + userID)
                res.json({
                    status: "FAILED",
                    message: "An error occured while turning off email multi-factor authentication."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.log('Error occured while turning off email MFA: ' + error)
        console.log('The error occured for account with user ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "Error finding user."
        })
    })
})

router.post('/sendemailverificationcode', async (req, res) => {
    let {userID, task, getAccountMethod, username, email} = req.body;
    userID = userID.toString().trim();

    try {
        var randomString = await axios.get('https://www.random.org/integers/?num=1&min=1&max=1000000000&col=1&base=16&format=plain&rnd=new')
        randomString = randomString.data.trim();
        console.log('Random string generated: ' + randomString)

        if (randomString.length != 8) {
            console.log('An error occured while generating random string. The random string that was generated is: ' + randomString)
            res.json({
                status: "FAILED",
                message: "An error occured while generating random string. Please try again later."
            })
            return
        }
    } catch (error) {
        console.log(error)
        console.log('An error occured while getting a random string.')
        res.json({
            status: "FAILED",
            message: "An error occured while creating a random string."
        })
        return
    }

    if (getAccountMethod == 'userID') {

        User.find({_id: userID}).then(async (userFound) => {
            if (userFound.length) {
                const saltRounds = 10;
                try {
                    var hashedRandomString = await bcrypt.hash(randomString, saltRounds);
                } catch (error) {
                    console.log(error)
                    console.log('Am error occured while hashing random string.')
                    res.json({
                        status: "FAILED",
                        message: "An error occured while hashing the random string."
                    })
                    return
                }
                const success = setCacheItem('EmailVerificationCodeCache', userID, hashedRandomString);
                if (!success) {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while setting random string."
                    })
                    return
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "User not found."
                })
                return
            }
        }).catch(error => {
            console.log(error)
            console.log('An error occured while finding user with user ID: ' + userID)
            res.json({
                status: "FAILED",
                message: "An error occured while finding the user."
            })
            return
        })

        if (task == "Add Email Multi-Factor Authentication") {
            var emailData = {
                from: process.env.SMTP_EMAIL,
                to: email,
                subject: "Add Email as a Multi-Factor Authentication to your SocialSquare account",
                text: `Your account requested to add email as a factor for multi-factor authentication. Please enter this code into SocialSquare to add email as a factor for multi-factor authentication: ${randomString}. If you did not request this, please change your password as only users who are logged into your account can make this request.`,
                html: `<p>Your account requested to add email as a factor for multi-factor authentication. Please enter this code into SocialSquare to add email as a factor for multi-factor authentication: ${randomString}. If you did not request this, please change your password as only users who are logged into your account can make this request.</p>`
            };
        } else {
            res.json({
                status: "FAILED",
                message: "Unknown task sent."
            })
            return
        }

        mailTransporter.sendMail(emailData, function(error, response){ // Modified answer from https://github.com/nodemailer/nodemailer/issues/169#issuecomment-20463956
            if(error){
                console.log("Error happened while sending email to user for task: " + task + ". User ID for user was: " + userID);
                console.log("Error type:", error.name);
                console.log("SMTP log:", error.data);
                res.json({
                    status: "FAILED",
                    message: "Error sending email."
                })
            } else if (response) {
                console.log('Sent random string to user.')
                res.json({
                    status: "SUCCESS",
                    message: "Email sent.",
                    data: {email: email, fromAddress: process.env.SMTP_EMAIL}
                })
            } else {
                console.log('Mail send error object: ' + error);
                console.log('Mail send response object: ' + response);
                res.json({
                    status: "FAILED",
                    message: "An unexpected error occured while sending email."
                })
            }
        });

    } else if (getAccountMethod == "username") {
        res.json({
            status: "FAILED",
            message: "username getAccountMethod is not supported yet. This will be coming soon."
        })
    } else {
        res.json({
            status: "FAILED",
            message: "Unrecognized getAccountMethod sent."
        })
    }
})

router.post('/deleteaccount', (req, res) => {
    let {userID} = req.body;
    userID = userID.toString().trim();
    console.log('Trying to delete user with ID: ' + userID)

    User.find({_id: userID}).then(userFound => {
        User.deleteOne({_id: userID}).then(function() {
            if (userFound[0] && userFound[0].profileImageKey !== '') {
                let filepath = path.resolve(process.env.UPLOADED_PATH, userFound[0].profileImageKey);
                fs.unlink(filepath, (err) => {
                    if (err) {
                        console.error(err)
                        console.error('Error deleting profile image with key: ' + userFound[0].profileImageKey)
                    }
                })
            }
            console.log('Deleted user with ID: ' + userID)
            ImagePost.find({imageCreatorId: userID}).then(images => {
                images.map(image => {
                    ImagePost.deleteOne({_id: image._id}).then(function() {
                        let filepath = path.resolve(process.env.UPLOADED_PATH, image.imageKey);
                        fs.unlink(filepath, function(err) {
                            if (err) {
                                console.log('Error deleting image: ' + err)
                            }
                        })
                    }).catch(error => {
                        console.error('Error deleting image post with ID: ' + image._id)
                        console.error(error)
                    })
                })
                console.log('Deleted all image posts created by user with ID: ' + userID);
                Poll.deleteMany({pollCreatorId: userID}).then(function() {
                    console.log('Deleted all polls created by user with ID: ' + userID);
                    Thread.find({creatorId: userID}).then(threads => {
                        threads.map(thread => {
                            Thread.deleteOne({_id: thread._id}).then(function(){
                                if (thread.threadType == "Images") {
                                    let filepath = path.resolve(process.env.UPLOADED_PATH, thread.threadImageKey);
                                    fs.unlink(filepath, function(err) {
                                        if (err) {
                                            console.log('Error deleting image: ' + err)
                                        }
                                    })
                                }
                            }).catch(err => {
                                console.error('Error deleting thread with ID: ' + thread._id)
                                console.error(err)
                            });
                        })
                        console.log('Deleted all threads created by user with ID: ' + userID);
                        Message.deleteMany({senderId: userID}).then(function() {
                            console.log('Deleted all messages sent by user with ID: ' + userID);
                            User.find({followers: {$in: [userID]}}).then(usersFollowersFound => {
                                if (usersFollowersFound.length) {
                                    usersFollowersFound.forEach(user => {
                                        User.findOneAndUpdate({_id: user._id}, {$pull: {followers: userID}}).then(function() {
                                            console.log('Removed user ID ' + userID + ' from followers of user ID ' + user._id)
                                        }).catch(error => {
                                            console.log(error)
                                            console.log('An error occured while removing user ID ' + userID + ' from followers of user ID ' + user._id)
                                        })
                                    })
                                }
                                User.find({following: {$in: [userID]}}).then(usersFollowingFound => {
                                    if (usersFollowingFound.length) {
                                        usersFollowingFound.forEach(user => {
                                            User.findOneAndUpdate({_id: user._id}, {$pull: {following: userID}}).then(function() {
                                                console.log('Removed user ID ' + userID + ' from following of user ID ' + user._id)
                                            }).catch(error => {
                                                console.log(error)
                                                console.log('An error occured while removing user ID ' + userID + ' from following of user ID ' + user._id)
                                            })
                                        })
                                    }
                                    User.find({blockedAccounts: {$in: [userID]}}).then(usersBlockedFound => {
                                        if (usersBlockedFound.length) {
                                            usersBlockedFound.forEach(user => {
                                                User.findOneAndUpdate({_id: user._id}, {$pull: {blockedAccounts: userID}}).then(function() {
                                                    console.log('Removed user ID ' + userID + ' from blocked accounts of user ID ' + user._id)
                                                }).catch(error => {
                                                    console.log(error)
                                                    console.log('An error occured while removing user ID ' + userID + ' from blocked accounts of user ID ' + user._id)
                                                })
                                            })
                                        }
                                        if (userFound.length) {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Account deleted."
                                            })
                                        } else {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Any undeleted data has now been deleted."
                                            })
                                        }
                                    }).catch(error => {
                                        console.log(error)
                                        console.log('An error occured while finding users who have user ID ' + userID + ' in their blocked accounts.')
                                        res.json({
                                            status: "FAILED",
                                            message: "An error occured while finding users who have blocked you"
                                        })
                                    })
                                }).catch(error => {
                                    console.log(error)
                                    console.log('An error occured while finding users who are following user ID ' + userID)
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occured while finding users who you are following"
                                    })
                                })
                            }).catch(error => {
                                console.log(error)
                                console.log('An error occured while finding users who follow user ID ' + userID)
                                res.json({
                                    status: "FAILED",
                                    message: "An error occured while finding users who follow you"
                                })
                            })
                        }).catch(error => {
                            console.log(error)
                            console.log('An error occured while deleting messages sent by user with user ID: ' + userID)
                            res.json({
                                status: "FAILED",
                                message: "An error occured while deleting messages."
                            })
                        })
                    }).catch(error => {
                        console.log(error)
                        console.log('An error occured while deleting threads for user with ID: ' + userID)
                        res.json({
                            status: "FAILED",
                            message: "An error occured while deleting threads."
                        })
                    })
                }).catch(error => {
                    console.log('Error occured while deleting polls: ' + error)
                    console.log('The error occured for account with user ID: ' + userID)
                    res.json({
                        status: "FAILED",
                        message: "An error occured while deleting polls."
                    })
                })       
            }).catch(error => {
                console.log(error)
                console.log('An error occured while deleting image posts for user with user ID: ' + userID)
                res.json({
                    status: "FAILED",
                    message: "An error occured while deleting image posts."
                })
            })
        }).catch(error => {
            console.log(error)
            console.log('An error occured while deleting user with user ID: ' + userID)
            res.json({
                status: "FAILED",
                message: "An error occured while deleting user."
            })
        })
    }).catch(error => {
        console.log(error)
        console.log('An error occured while finding user with user ID: ' + userID)
        res.json({
            status: "FAILED",
            message: "An error occured while finding user."
        })
    })
})

router.get('/checkIfCategoryExists/:categoryTitle', (req, res) => {
    let categoryTitle = req.params.categoryTitle;

    Category.find({categoryTitle: {'$regex': `^${categoryTitle}$`, $options: 'i'}}).then(categoryFound => {
        if (categoryFound.length) {
            res.json({
                status: "SUCCESS",
                message: true
            })
        } else {
            res.json({
                status: "SUCCESS",
                message: false
            })
        }
    }).catch(error => {
        console.error('An error occured while checking if a category existed.')
        console.error(error)
        res.json({
            status: "FAILED",
            message: "An error occured. Please try again later."
        })
    })
})

router.post('/uploadNotificationsSettings', (req, res) => {
    let {notificationSettings, userID} = req.body;

    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            let newUserSettings = userFound[0].settings;
            let newNotificationSettings = newUserSettings.notificationSettings;
            if (typeof notificationSettings.TextMessages == 'boolean') {
                newNotificationSettings.TextMessages = notificationSettings.TextMessages;
            }
            if (typeof notificationSettings.GainsFollower == 'boolean') {
                newNotificationSettings.GainsFollower = notificationSettings.GainsFollower;
            }
            if (typeof notificationSettings.FollowRequests == 'boolean') {
                newNotificationSettings.FollowRequests = notificationSettings.FollowRequests;
            }
            if (typeof notificationSettings.UpvotesOnMultimediaPosts == 'boolean') {
                newNotificationSettings.UpvotesOnMultimediaPosts = notificationSettings.UpvotesOnMultimediaPosts;
            }
            if (typeof notificationSettings.NeutralVotesOnMultimediaPosts == 'boolean') {
                newNotificationSettings.NeutralVotesOnMultimediaPosts = notificationSettings.NeutralVotesOnMultimediaPosts;
            }
            if (typeof notificationSettings.DownvotesOnMultimediaPosts == 'boolean') {
                newNotificationSettings.DownvotesOnMultimediaPosts = notificationSettings.DownvotesOnMultimediaPosts;
            }
            if (typeof notificationSettings.UpvotesOnVideos == 'boolean') {
                newNotificationSettings.UpvotesOnVideos = notificationSettings.UpvotesOnVideos;
            }
            if (typeof notificationSettings.NeutralVotesOnVideos == 'boolean') {
                newNotificationSettings.NeutralVotesOnVideos = notificationSettings.NeutralVotesOnVideos;
            }
            if (typeof notificationSettings.DownvotesOnVideos == 'boolean') {
                newNotificationSettings.DownvotesOnVideos = notificationSettings.DownvotesOnVideos;
            }
            if (typeof notificationSettings.UpvotesOnPolls == 'boolean') {
                newNotificationSettings.UpvotesOnPolls = notificationSettings.UpvotesOnPolls;
            }
            if (typeof notificationSettings.NeutralVotesOnPolls == 'boolean') {
                newNotificationSettings.NeutralVotesOnPolls = notificationSettings.NeutralVotesOnPolls;
            }
            if (typeof notificationSettings.DownvotesOnPolls == 'boolean') {
                newNotificationSettings.DownvotesOnPolls = notificationSettings.DownvotesOnPolls;
            }
            if (typeof notificationSettings.UpvotesOnThreads == 'boolean') {
                newNotificationSettings.UpvotesOnThreads = notificationSettings.UpvotesOnThreads;
            }
            if (typeof notificationSettings.NeutralVotesOnThreads == 'boolean') {
                newNotificationSettings.NeutralVotesOnThreads = notificationSettings.NeutralVotesOnThreads;
            }
            if (typeof notificationSettings.DownvotesOnThreads == 'boolean') {
                newNotificationSettings.DownvotesOnThreads = notificationSettings.DownvotesOnThreads;
            }
            if (typeof notificationSettings.PersonJoiningCategory == 'boolean') {
                newNotificationSettings.PersonJoiningCategory = notificationSettings.PersonJoiningCategory;
            }
            if (typeof notificationSettings.SendTextMessages == 'boolean') {
                newNotificationSettings.SendTextMessages = notificationSettings.SendTextMessages;
            }
            if (typeof notificationSettings.SendGainsFollower == 'boolean') {
                newNotificationSettings.SendGainsFollower = notificationSettings.SendGainsFollower;
            }
            if (typeof notificationSettings.SendFollowRequests == 'boolean') {
                newNotificationSettings.SendFollowRequests = notificationSettings.SendFollowRequests;
            }
            if (typeof notificationSettings.SendUpvotesOnMultimediaPosts == 'boolean') {
                newNotificationSettings.SendUpvotesOnMultimediaPosts = notificationSettings.SendUpvotesOnMultimediaPosts;
            }
            if (typeof notificationSettings.SendNeutralVotesOnMultimediaPosts == 'boolean') {
                newNotificationSettings.SendNeutralVotesOnMultimediaPosts = notificationSettings.SendNeutralVotesOnMultimediaPosts;
            }
            if (typeof notificationSettings.SendDownvotesOnMultimediaPosts == 'boolean') {
                newNotificationSettings.SendDownvotesOnMultimediaPosts = notificationSettings.SendDownvotesOnMultimediaPosts;
            }
            if (typeof notificationSettings.SendUpvotesOnVideos == 'boolean') {
                newNotificationSettings.SendUpvotesOnVideos = notificationSettings.SendUpvotesOnVideos;
            }
            if (typeof notificationSettings.SendNeutralVotesOnVideos == 'boolean') {
                newNotificationSettings.SendNeutralVotesOnVideos = notificationSettings.SendNeutralVotesOnVideos;
            }
            if (typeof notificationSettings.SendDownvotesOnVideos == 'boolean') {
                newNotificationSettings.SendDownvotesOnVideos = notificationSettings.SendDownvotesOnVideos;
            }
            if (typeof notificationSettings.SendUpvotesOnPolls == 'boolean') {
                newNotificationSettings.SendUpvotesOnPolls = notificationSettings.SendUpvotesOnPolls;
            }
            if (typeof notificationSettings.SendNeutralVotesOnPolls == 'boolean') {
                newNotificationSettings.SendNeutralVotesOnPolls = notificationSettings.SendNeutralVotesOnPolls;
            }
            if (typeof notificationSettings.SendDownvotesOnPolls == 'boolean') {
                newNotificationSettings.SendDownvotesOnPolls = notificationSettings.SendDownvotesOnPolls;
            }
            if (typeof notificationSettings.SendUpvotesOnThreads == 'boolean') {
                newNotificationSettings.SendUpvotesOnThreads = notificationSettings.SendUpvotesOnThreads;
            }
            if (typeof notificationSettings.SendNeutralVotesOnThreads == 'boolean') {
                newNotificationSettings.SendNeutralVotesOnThreads = notificationSettings.SendNeutralVotesOnThreads;
            }
            if (typeof notificationSettings.SendDownvotesOnThreads == 'boolean') {
                newNotificationSettings.SendDownvotesOnThreads = notificationSettings.SendDownvotesOnThreads;
            }
            if (typeof notificationSettings.SendJoiningCategory == 'boolean') {
                newNotificationSettings.SendJoiningCategory = notificationSettings.SendJoiningCategory;
            }
            newUserSettings.notificationSettings = newNotificationSettings;

            User.findOneAndUpdate({_id: userID}, {settings: newUserSettings}).then(function() {
                res.json({
                    status: "SUCCESS",
                    message: "Notification settings updated successfully."
                })
            }).catch(error => {
                console.error('An error occured while changing notification settings for user with ID: ' + userID);
                console.error('This is the error: ' + error)
                res.json({
                    status: "FAILED",
                    message: "An error occured while updating notification settings."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.error('An error occured while finding user with ID: ' + userID)
        console.error('The error was: ' + error)
    })
})

router.get('/getUserNotificationSettings/:userID', (req, res) => {
    const userID = req.params.userID;
    User.find({_id: userID}).then(userFound => {
        if (userFound.length) {
            res.json({
                status: "SUCCESS",
                message: "Notification settings retrieved successfully.",
                data: userFound[0].settings.notificationSettings
            })
        } else {
            res.json({
                status: "FAILED",
                message: "User not found."
            })
        }
    }).catch(error => {
        console.error('An error occured while finding user with ID: ' + userID)
        console.error('The error was: ' + error)
        res.json({
            status: "FAILED",
            message: "An error occured while getting notification settings. Please try again later."
        })
    })
})

const validReportOptions = {Content: ["Spam", "Nudity/Sexual", "Don't Like", "Hate", "SelfHarm", "Illegal/Regulated goods", "Violence/Dangerous", "Bullying/Harassment", "Intellectual property violation", "Scam/Fraud", "False Info"], Age: ["Underage"], Impersonation: ["Of Reporter", "Of Someone Reporter Knows", "Celebrity/Public", "Business/Organisation"]}

router.post('/reportUser', (req, res) => {
    let {reportType, reporterId, reporteePubId} = req.body; // maybe add a body which is just text the reporter can add to emphasize their point.
    User.find({_id: reporterId}).then(reporterFound => {
        if (reporterFound.length) {
            User.find({secondId: reporteePubId}).then(reporteeFound => {
                if (reporteeFound.length) {
                    if (validReportOptions[reportType?.topic].includes(reportType?.subTopic)) {
                        console.log(`Valid report passed by: ${reporterFound[0].name} about ${reporteeFound[0].name} with the reasoning being: ${reportType.topic}-${reportType.subTopic}`)
                        //send an email for now we can have a admin console later or something.
                        var emailData = {
                            from: process.env.SMTP_EMAIL,
                            to: process.env.SS_MODERATION_EMAIL,
                            subject: "Account Report",
                            text: `User of _id:\n${reporterFound[0]._id} filed a report on user of _id:\n${reporteeFound[0]._id}\nReport Topic: ${reportType.topic}\nReport SubTopic: ${reportType.subTopic}`,
                            html: `<p>User of _id:\n${reporterFound[0]._id} filed a report on user of _id:\n${reporteeFound[0]._id}\nReport Topic: ${reportType.topic}\nReport SubTopic: ${reportType.subTopic}</p>`
                        };
                        mailTransporter.sendMail(emailData, function(error, response){ // Modified answer from https://github.com/nodemailer/nodemailer/issues/169#issuecomment-20463956
                            if(error){
                                console.log("Error happened while sending email regarding report: ");
                                console.log(error);
                                res.json({
                                    status: "FAILED",
                                    message: "Error transporting report to moderation."
                                })
                            } else if (response) {
                                console.log('Sent moderation email.')
                                res.json({
                                    status: "SUCCESS",
                                    message: "User reported."
                                })
                            } else {
                                console.log('Mail send error object: ' + error);
                                console.log('Mail send response object: ' + response);
                                res.json({
                                    status: "FAILED",
                                    message: "An unexpected error occured while transporting report to moderation."
                                })
                            }
                        });
                    } else {
                        console.log("Invalid report options chosen.")
                        res.json({
                            status: "FAILED",
                            message: "Invalid report options provided."
                        })
                    }
                }
            }).catch(error => {
                console.log("An error occured while searching for user to report: ")
                console.log(error)
                res.json({
                    status: "FAILED",
                    message: "An error occured while searching for user to report."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "Couldn't find user with ID provided."
            })
        }
    }).catch(error => {
        console.log("Error occured while searching for user making request: ")
        console.log(error)
        res.json({
            status: "FAILED",
            message: "Error occured while searching for user making request."
        })
    })
})

module.exports = router;
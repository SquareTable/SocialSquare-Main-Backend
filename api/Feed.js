const express = require('express');
const router = express.Router();

//
const mongodb = require('mongodb');

//Schemas
const User = require('./../models/User');
const Poll = require('./../models/Poll');
const ImagePost = require('./../models/ImagePost');
const Category = require('./../models/Category');
const Thread = require('./../models/Thread')

//view posts in feed 
router.post('/viewedPostInFeed', (req, res) => {
    let {userId, postId, postFormat} = req.body;

    User.find({_id: userId}).then(userOfViewing => {
        if (userOfViewing.length) {
            if (postFormat == "Image") {
                //Image
                ImagePost.find({_id: postId}).then(postFound => {
                    if (postFound.length) {
                        const indexIfUserIsInViewed = postFound[0].viewedBy.findIndex(x => x.pubId == userOfViewing[0].secondId)
                        if (indexIfUserIsInViewed == -1) {
                            //already there
                            ImagePost.findOneAndUpdate({ _id: postId}, { $push: { viewedBy: { pubId: userOfViewing[0].secondId, amount: 1 } } }).then(function() {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Viewed"
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error when updating."
                                })
                            })
                        } else {
                            var amountPlusOne = postFound[0].viewedBy[indexIfUserIsInViewed].amount+1
                            //already there
                            ImagePost.findOneAndUpdate(
                                {
                                    _id: postId,
                                    'viewedBy.pubId': userOfViewing[0].secondId
                                },
                                {
                                    $set: {
                                        'viewedBy.$.amount': amountPlusOne
                                    }
                                }
                            ).then(function() {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Viewed"
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error when updating."
                                })
                            })
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find image post viewing in feed."
                        })
                    }
                }).catch(err => {
                    console.log(`Error finding image post viewing in feed: ${err}`)
                    res.json({
                        status: "FAILED",
                        message: "Error finding image post viewing in feed."
                    })
                })
            } else if (postFormat == "Poll") {
                //Poll
                Poll.find({_id: postId}).then(postFound => {
                    if (postFound.length) {
                        const indexIfUserIsInViewed = postFound[0].viewedBy.findIndex(x => x.pubId == userOfViewing[0].secondId)
                        if (indexIfUserIsInViewed == -1) {
                            //already there
                            Poll.findOneAndUpdate({ _id: postId }, { $push: { viewedBy: { pubId: userOfViewing[0].secondId, amount: 1 } } }).then(function() {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Viewed"
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error when updating."
                                })
                            })
                        } else {
                            var amountPlusOne = postFound[0].viewedBy[indexIfUserIsInViewed].amount+1
                            //already there
                            Poll.findOneAndUpdate(
                                {
                                    _id: postId,
                                    'viewedBy.pubId': userOfViewing[0].secondId
                                },
                                {
                                    $set: {
                                        'viewedBy.$.amount': amountPlusOne
                                    }
                                }
                            ).then(function() {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Viewed"
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error when updating."
                                })
                            })
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find poll post viewing in feed."
                        })
                    }
                }).catch(err => {
                    console.log(`Error finding poll post viewing in feed: ${err}`)
                    res.json({
                        status: "FAILED",
                        message: "Error finding poll post viewing in feed."
                    })
                })
            } else if (postFormat == "Thread") {
                //Thread
                Thread.find({_id: postId}).then(postFound => {
                    if (postFound.length) {
                        const indexIfUserIsInViewed = postFound[0].viewedBy.findIndex(x => x.pubId == userOfViewing[0].secondId)
                        if (indexIfUserIsInViewed == -1) {
                            //already there
                            Thread.findOneAndUpdate({ _id: postId }, { $push: { viewedBy: { pubId: userOfViewing[0].secondId, amount: 1 } } }).then(function() {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Viewed"
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error when updating."
                                })
                            })
                        } else {
                            var amountPlusOne = postFound[0].viewedBy[indexIfUserIsInViewed].amount+1
                            //already there
                            Thread.findOneAndUpdate(
                                {
                                    _id: postId,
                                    'viewedBy.pubId': userOfViewing[0].secondId
                                },
                                {
                                    $set: {
                                        'viewedBy.$.amount': amountPlusOne
                                    }
                                }
                            ).then(function() {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Viewed"
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error when updating."
                                })
                            })
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find thread post viewing in feed."
                        })
                    }
                }).catch(err => {
                    console.log(`Error finding thread post viewing in feed: ${err}`)
                    res.json({
                        status: "FAILED",
                        message: "Error finding thread post viewing in feed."
                    })
                })
            } else {
                //invalid format
                res.json({
                    status: "FAILED",
                    message: "Invalid format."
                })
            }
        } else {
            res.json({
                status: "FAILED",
                message: "Couldn't find user thats viewing post in feed."
            })
        }
    }).catch(err => {
        console.log(`Error finding user viewing: ${err}`)
        res.json({
            status: "FAILED",
            message: "Error finding user thats viewing post in feed."
        })
    })
})

//feed of followed
router.get('/followerFeed/:idOfUser/:alreadyOnCurrentFeed', (req, res) => {
    let idOfUser = req.params.idOfUser
    const alreadyOnCurrentFeed = req.params.alreadyOnCurrentFeed
    
    if (typeof alreadyOnCurrentFeed === 'string' || alreadyOnCurrentFeed instanceof String) {

        var splitAlreadyOnCurrentFeedIds = alreadyOnCurrentFeed.split(",")
        const alreadyOnCurrentFeedIds = splitAlreadyOnCurrentFeedIds.map(x => x.trim())
        //Check if user exists
        User.find({_id: idOfUser}).then(userFound => {
            if (userFound.length) {
                const userIsFollowing = userFound[0].following // is pub ids
                if (userIsFollowing.length !== 0) {
                    //Probs want to change later
                    const afterGettingAllPosts = (allPostsWithRequiredFields) => {
                        //remove any falsey values (they will not have a date time so ill use that)
                        //console.log("allPostsWithRequiredFields")
                        //console.log(allPostsWithRequiredFields)
                        const filteredAllPostsWithRequiredFields = allPostsWithRequiredFields.filter(x => typeof x.datePosted == "string")
                        if (filteredAllPostsWithRequiredFields.length !== 0) {
                            //sort by date
                            const sortedResult = filteredAllPostsWithRequiredFields.sort(function(a, b){
                                var first = a.datePosted.split(" ")[0];
                                var second = b.datePosted.split(" ")[0];
                                if (first !== second) {
                                    var aa = first.split('/').reverse().join(),
                                        bb = second.split('/').reverse().join();
                                    return aa > bb ? -1 : (aa > bb ? 1 : 0);
                                } else {
                                    var ind11 = a.datePosted.indexOf(' ');
                                    var ind12 = a.datePosted.indexOf(' ', ind11 + 1);
                                    var firstTime = a.datePosted.substring(ind12);
                                    var ind21 = b.datePosted.indexOf(' ');
                                    var ind22 = b.datePosted.indexOf(' ', ind21 + 1);
                                    var secondTime = b.datePosted.substring(ind22);
                                    return firstTime > secondTime ? -1 : (firstTime > secondTime ? 1 : 0);
                                }
                            });
                            //split into has viewed (twice or more so u can view it twice before it doesnt show) and hasnt viewed
                            function hasViewedChecker(propertyOfViewed) {
                                if (propertyOfViewed.interacted == false) {
                                    indexOfThisUsers = propertyOfViewed.viewedBy.findIndex(x => x.pubId == userFound[0].secondId)
                                    if (indexOfThisUsers !== -1) {
                                        if (propertyOfViewed.viewedBy[indexOfThisUsers].amount < 2) {
                                            return false
                                        } else {
                                            return true
                                        }
                                    } else {
                                        return false
                                    }
                                } else {
                                    return true
                                }
                            }
                            function hasNotViewedChecker(propertyOfViewed) {
                                if (propertyOfViewed.interacted == false) {
                                    indexOfThisUsers = propertyOfViewed.viewedBy.findIndex(x => x.pubId == userFound[0].secondId)
                                    if (indexOfThisUsers !== -1) {
                                        if (propertyOfViewed.viewedBy[indexOfThisUsers].amount < 2) {
                                            return true
                                        } else {
                                            return false
                                        }
                                    } else {
                                        return true
                                    }
                                } else {
                                    return false
                                }
                                
                            }

                            //console.log("Before filter")
                            //console.log("sortedResult")
                            //console.log(sortedResult)
                            const hasViewedPostsWithRequiredFields = sortedResult.slice().filter(hasViewedChecker)
                            const hasNotViewedPostsWithRequiredFields = sortedResult.slice().filter(hasNotViewedChecker)
                            
                            //console.log("After filter, first is has viewed, second is has not viewed.")
                            //console.log(hasViewedPostsWithRequiredFields)
                            //console.log(hasNotViewedPostsWithRequiredFields)

                            const sendBack = (allPostsForSendBackInOrder) => {
                                res.json({
                                    status: "SUCCESS",
                                    data: allPostsForSendBackInOrder
                                })
                            }

                            const alreadyOnCurrentFeedIdsChecker = (propertyOfViewed, idTesting) => {
                                try {
                                    //console.log(propertyOfViewed + " " + idTesting)
                                    
                                    const idVersionOfPropertyViewed = new mongodb.ObjectID(propertyOfViewed)

                                    if (idVersionOfPropertyViewed.equals(idTesting)) {
                                        //console.log("Found match of ids in alreadyOnCurrentFeedIdsChecker " + propertyOfViewed + " " + idTesting)
                                        return true
                                    } else {    
                                        //console.log("Not match of ids in alreadyOnCurrentFeedIdsChecker " + propertyOfViewed + " " + idTesting)
                                        return false
                                    }
                                } catch (err) {
                                    //console.log(`alreadyOnCurrentFeedIdsChecker: ${err}`) //should happed a lot so commented out
                                    return false
                                }
                            }

                            const forAlreadyViewedOnes = (forSendBackItemsProcessed, postsForResponse) => {
                                //console.log("forAlreadyViewedOnes postsforresponse:")
                                //console.log(postsForResponse)
                                hasViewedPostsWithRequiredFields.forEach(function (item, index) {
                                    //console.log(alreadyOnCurrentFeedIds)
                                    if (alreadyOnCurrentFeedIds.findIndex(x => alreadyOnCurrentFeedIdsChecker(x, hasViewedPostsWithRequiredFields[index]._id)) == -1) {
                                        if (hasViewedPostsWithRequiredFields[index].format == "Image") {
                                            //image
                                            ImagePost.find({_id: hasViewedPostsWithRequiredFields[index]._id}).then(foundImg => {
                                                if (foundImg.length) {
                                                    User.find({_id: foundImg[0].imageCreatorId}).then(postUserFound => {
                                                        if (postUserFound.length) {
                                                            var imageUpVotes = foundImg[0].imageUpVotes.length-foundImg[0].imageDownVotes.length
                                                            var imageUpVoted = false
                                                            if (foundImg[0].imageUpVotes.includes(userFound[0]._id)) {
                                                                imageUpVoted = true
                                                            }
                                                            var imageDownVoted = false
                                                            if (foundImg[0].imageDownVotes.includes(userFound[0]._id)) {
                                                                imageDownVoted = true
                                                            }
                                                            forPush = {
                                                                format: "Image",
                                                                imageId: foundImg[0]._id,
                                                                imageKey: foundImg[0].imageKey,
                                                                imageTitle: foundImg[0].imageTitle,
                                                                imageDescription: foundImg[0].imageDescription,
                                                                imageUpVotes: imageUpVotes,
                                                                imageComments: foundImg[0].imageComments,
                                                                creatorName: postUserFound[0].name,
                                                                creatorDisplayName: postUserFound[0].displayName,
                                                                creatorPfpKey: postUserFound[0].profileImageKey,
                                                                datePosted: foundImg[0].datePosted,
                                                                imageUpVoted: imageUpVoted,
                                                                imageDownVoted: imageDownVoted,
                                                                allowScreenShots: foundImg[0].allowScreenShots,
                                                                hasSeenPosts: true //so there can be indicator or front end that says from now on posts may have been seen already
                                                            }
                                                            postsForResponse.push(forPush)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                            if (hasViewedLengthAndNotViewedLength < 10) {
                                                                if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            console.log(`Couldn't find user image creator: ${err}`)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                            if (hasViewedLengthAndNotViewedLength < 10) {
                                                                if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        console.log(`Error finding user image creator: ${err}`)
                                                        forSendBackItemsProcessed++;
                                                        //do like 10 load
                                                        var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                        if (hasViewedLengthAndNotViewedLength < 10) {
                                                            if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        } else {
                                                            //more than 10
                                                            if (postsForResponse.length == 10) {
                                                                sendBack(postsForResponse)
                                                            } else {
                                                                if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        }
                                                    })
                                                } else {
                                                    console.log("Image couldn't be found with _id")
                                                    forSendBackItemsProcessed++;
                                                    //do like 10 load
                                                    var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                    if (hasViewedLengthAndNotViewedLength < 10) {
                                                        if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    } else {
                                                        //more than 10
                                                        if (postsForResponse.length == 10) {
                                                            sendBack(postsForResponse)
                                                        } else {
                                                            if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    }
                                                }
                                            }).catch(err => {
                                                //Error finding image posts
                                                console.log(`Error finding image posts ${err}`)
                                                forSendBackItemsProcessed++;
                                                //do like 10 load
                                                var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                if (hasViewedLengthAndNotViewedLength < 10) {
                                                    if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                        sendBack(postsForResponse)
                                                    }
                                                } else {
                                                    //more than 10
                                                    if (postsForResponse.length == 10) {
                                                        sendBack(postsForResponse)
                                                    } else {
                                                        if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                }
                                            })
                                        } else if (hasViewedPostsWithRequiredFields[index].format == "Poll") {
                                            //poll
                                            Poll.find({_id: hasViewedPostsWithRequiredFields[index]._id}).then(foundPoll => {
                                                if (foundPoll.length) {
                                                    User.find({_id: foundPoll[0].pollCreatorId}).then(postUserFound => {
                                                        if (postUserFound.length) {
                                                            var pollUpOrDownVoted = "Neither";
                                                            var userVotedFor = "None"
                                                            if (foundPoll[0].pollUpVotes.includes(userFound[0]._id)) {
                                                                pollUpOrDownVoted = "UpVoted"
                                                            } else if (foundPoll[0].pollDownVotes.includes(userFound[0]._id)) {
                                                                pollUpOrDownVoted = "DownVoted"
                                                            } else {
                                                                pollUpOrDownVoted = "Neither"
                                                            }
                                                            if (foundPoll[0].optionOnesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "One"
                                                            } else if (foundPoll[0].optionTwosVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Two"
                                                            } else if (foundPoll[0].optionThreesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Three"
                                                            } else if (foundPoll[0].optionFoursVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Four"
                                                            } else if (foundPoll[0].optionFivesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Five"
                                                            } else if (foundPoll[0].optionSixesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Six"
                                                            } else {
                                                                userVotedFor = "None"
                                                            }
                                                            //can clean up to get rid of excessive [0]
                                                            const toPush = {
                                                                format: "Poll",
                                                                _id: foundPoll[0]._id,
                                                                pollTitle: foundPoll[0].pollTitle,
                                                                pollSubTitle: foundPoll[0].pollSubTitle,
                                                                optionOne: foundPoll[0].optionOne,
                                                                optionOnesColor: foundPoll[0].optionOnesColor,
                                                                optionOnesVotes: foundPoll[0].optionOnesVotes.length,
                                                                optionTwo: foundPoll[0].optionTwo,
                                                                optionTwosColor: foundPoll[0].optionTwosColor,
                                                                optionTwosVotes: foundPoll[0].optionTwosVotes.length,
                                                                optionThree: foundPoll[0].optionThree,
                                                                optionThreesColor: foundPoll[0].optionThreesColor,
                                                                optionThreesVotes: foundPoll[0].optionThreesVotes.length,
                                                                optionFour: foundPoll[0].optionFour,
                                                                optionFoursColor: foundPoll[0].optionFoursColor,
                                                                optionFoursVotes: foundPoll[0].optionFoursVotes.length,
                                                                optionFive: foundPoll[0].optionFive,
                                                                optionFivesColor: foundPoll[0].optionFivesColor,
                                                                optionFivesVotes: foundPoll[0].optionFivesVotes.length,
                                                                optionSix: foundPoll[0].optionSix,
                                                                optionSixesColor: foundPoll[0].optionSixesColor,
                                                                optionSixesVotes: foundPoll[0].optionSixesVotes.length,
                                                                totalNumberOfOptions: foundPoll[0].totalNumberOfOptions,
                                                                pollUpOrDownVotes: (foundPoll[0].pollUpVotes.length-foundPoll[0].pollDownVotes.length),
                                                                votedFor: userVotedFor,
                                                                pollUpOrDownVoted: pollUpOrDownVoted,
                                                                pollComments: foundPoll[0].pollComments,
                                                                creatorPfpKey: postUserFound[0].profileImageKey,
                                                                creatorName: postUserFound[0].name,
                                                                creatorDisplayName: postUserFound[0].displayName,
                                                                datePosted: foundPoll[0].datePosted,
                                                                allowScreenShots: foundPoll[0].allowScreenShots,
                                                                hasSeenPosts: true
                                                            }
                                                            postsForResponse.push(toPush)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                            if (hasViewedLengthAndNotViewedLength < 10) {
                                                                if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            console.log(`Couldn't find user poll creator: ${err}`)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                            if (hasViewedLengthAndNotViewedLength < 10) {
                                                                if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        console.log(`Error finding user poll creator: ${err}`)
                                                        forSendBackItemsProcessed++;
                                                        //do like 10 load
                                                        var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                        if (hasViewedLengthAndNotViewedLength < 10) {
                                                            if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        } else {
                                                            //more than 10
                                                            if (postsForResponse.length == 10) {
                                                                sendBack(postsForResponse)
                                                            } else {
                                                                if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        }
                                                    })
                                                } else {
                                                    console.log("Poll couldn't be found with _id")
                                                    forSendBackItemsProcessed++;
                                                    //do like 10 load
                                                    var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                    if (hasViewedLengthAndNotViewedLength < 10) {
                                                        if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    } else {
                                                        //more than 10
                                                        if (postsForResponse.length == 10) {
                                                            sendBack(postsForResponse)
                                                        } else {
                                                            if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    }
                                                }
                                            }).catch(err => {
                                                //Error finding poll posts
                                                console.log(`Error finding poll posts ${err}`)
                                                forSendBackItemsProcessed++;
                                                //do like 10 load
                                                var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                if (hasViewedLengthAndNotViewedLength < 10) {
                                                    if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                        sendBack(postsForResponse)
                                                    }
                                                } else {
                                                    //more than 10
                                                    if (postsForResponse.length == 10) {
                                                        sendBack(postsForResponse)
                                                    } else {
                                                        if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                }
                                            })
                                        } else {
                                            //thread
                                            Thread.find({_id: hasViewedPostsWithRequiredFields[index]._id}).then(foundThread => {
                                                if (foundThread.length) {
                                                    User.find({_id: foundThread[0].creatorId}).then(postUserFound => {
                                                        if (postUserFound.length) {
                                                            console.log(`Thread found: ${foundThread[0]._id}`)
                                                            //
                                                            var threadType = foundThread[0].threadType
                                                            var threadComments = foundThread[0].threadComments.length
                                                            var threadUpVotes = (foundThread[0].threadUpVotes.length - foundThread[0].threadDownVotes.length)
                                                            var threadTitle =  foundThread[0].threadTitle
                                                            var threadSubtitle = foundThread[0].threadSubtitle
                                                            var threadTags = foundThread[0].threadTags
                                                            var threadCategory = foundThread[0].threadCategory
                                                            var threadBody = foundThread[0].threadBody
                                                            var threadImageKey = foundThread[0].threadImageKey
                                                            var threadImageDescription = foundThread[0].threadImageDescription
                                                            var threadNSFW = foundThread[0].threadNSFW
                                                            var threadNSFL = foundThread[0].threadNSFL
                                                            var datePosted = foundThread[0].datePosted
                                                            var creatorDisplayName = postUserFound[0].displayName
                                                            var creatorName = postUserFound[0].name
                                                            var creatorImageKey = postUserFound[0].profileImageKey
                                                            var allowScreenShots = foundThread[0].allowScreenShots
                                                            var threadUpVoted = false
                                                            var threadDownVoted = false
                                                            if (foundThread[0].threadUpVotes.includes(userFound[0]._id)) {
                                                                console.log("Thread Up voted")
                                                                //console.log("Up voted")
                                                                threadUpVoted = true
                                                                postsForResponse.push({
                                                                    format: "Thread",
                                                                    threadId: foundThread[0]._id,
                                                                    threadComments: threadComments,
                                                                    threadType: threadType,
                                                                    threadUpVotes: threadUpVotes,
                                                                    threadTitle: threadTitle,
                                                                    threadSubtitle: threadSubtitle,
                                                                    threadTags: threadTags,
                                                                    threadCategory: threadCategory,
                                                                    threadBody: threadBody,
                                                                    threadImageKey: threadImageKey,
                                                                    threadImageDescription: threadImageDescription,
                                                                    threadNSFW: threadNSFW,
                                                                    threadNSFL: threadNSFL,
                                                                    datePosted: datePosted,
                                                                    threadUpVoted: threadUpVoted,
                                                                    threadDownVoted: threadDownVoted,
                                                                    creatorDisplayName: creatorDisplayName,
                                                                    creatorName: creatorName,
                                                                    creatorImageKey: creatorImageKey,
                                                                    allowScreenShots: allowScreenShots,
                                                                    hasSeenPosts: true
                                                                })
                                                                forSendBackItemsProcessed++;
                                                                //do like 10 load
                                                                var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                                if (hasViewedLengthAndNotViewedLength < 10) {
                                                                    if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                } else {
                                                                    //more than 10
                                                                    if (postsForResponse.length == 10) {
                                                                        sendBack(postsForResponse)
                                                                    } else {
                                                                        if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                }
                                                            } else if (foundThread[0].threadDownVotes.includes(userFound[0]._id)) {
                                                                console.log("Thread Down voted")
                                                                //console.log("Down voted")
                                                                threadDownVoted = true
                                                                postsForResponse.push({
                                                                    format: "Thread",
                                                                    threadId: foundThread[0]._id,
                                                                    threadComments: threadComments,
                                                                    threadType: threadType,
                                                                    threadUpVotes: threadUpVotes,
                                                                    threadTitle: threadTitle,
                                                                    threadSubtitle: threadSubtitle,
                                                                    threadTags: threadTags,
                                                                    threadCategory: threadCategory,
                                                                    threadBody: threadBody,
                                                                    threadImageKey: threadImageKey,
                                                                    threadImageDescription: threadImageDescription,
                                                                    threadNSFW: threadNSFW,
                                                                    threadNSFL: threadNSFL,
                                                                    datePosted: datePosted,
                                                                    threadUpVoted: threadUpVoted,
                                                                    threadDownVoted: threadDownVoted,
                                                                    creatorDisplayName: creatorDisplayName,
                                                                    creatorName: creatorName,
                                                                    creatorImageKey: creatorImageKey,
                                                                    allowScreenShots: allowScreenShots,
                                                                    hasSeenPosts: true
                                                                })
                                                                forSendBackItemsProcessed++;
                                                                //do like 10 load
                                                                var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                                if (hasViewedLengthAndNotViewedLength < 10) {
                                                                    if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                } else {
                                                                    //more than 10
                                                                    if (postsForResponse.length == 10) {
                                                                        sendBack(postsForResponse)
                                                                    } else {
                                                                        if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                console.log("Thread Neither voted")
                                                                postsForResponse.push({
                                                                    format: "Thread",
                                                                    threadId: foundThread[0]._id,
                                                                    threadComments: threadComments,
                                                                    threadType: threadType,
                                                                    threadUpVotes: threadUpVotes,
                                                                    threadTitle: threadTitle,
                                                                    threadSubtitle: threadSubtitle,
                                                                    threadTags: threadTags,
                                                                    threadCategory: threadCategory,
                                                                    threadBody: threadBody,
                                                                    threadImageKey: threadImageKey,
                                                                    threadImageDescription: threadImageDescription,
                                                                    threadNSFW: threadNSFW,
                                                                    threadNSFL: threadNSFL,
                                                                    datePosted: datePosted,
                                                                    threadUpVoted: threadUpVoted,
                                                                    threadDownVoted: threadDownVoted,
                                                                    creatorDisplayName: creatorDisplayName,
                                                                    creatorName: creatorName,
                                                                    creatorImageKey: creatorImageKey,
                                                                    allowScreenShots: allowScreenShots,
                                                                    hasSeenPosts: true
                                                                })
                                                                forSendBackItemsProcessed++;
                                                                //do like 10 load
                                                                var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                                if (hasViewedLengthAndNotViewedLength < 10) {
                                                                    if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                } else {
                                                                    //more than 10
                                                                    if (postsForResponse.length == 10) {
                                                                        sendBack(postsForResponse)
                                                                    } else {
                                                                        if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            console.log(`Couldn't find user thread creator: ${err}`)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                            if (hasViewedLengthAndNotViewedLength < 10) {
                                                                if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        console.log(`Error finding user thread creator: ${err}`)
                                                        forSendBackItemsProcessed++;
                                                        //do like 10 load
                                                        var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                        if (hasViewedLengthAndNotViewedLength < 10) {
                                                            if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        } else {
                                                            //more than 10
                                                            if (postsForResponse.length == 10) {
                                                                sendBack(postsForResponse)
                                                            } else {
                                                                if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        }
                                                    })
                                                } else {
                                                    console.log("Thread couldn't be found with _id")
                                                    forSendBackItemsProcessed++;
                                                    //do like 10 load
                                                    var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                    if (hasViewedLengthAndNotViewedLength < 10) {
                                                        if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    } else {
                                                        //more than 10
                                                        if (postsForResponse.length == 10) {
                                                            sendBack(postsForResponse)
                                                        } else {
                                                            if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    }
                                                }
                                            }).catch(err => {
                                                //Error finding thread posts
                                                console.log(`Error finding thread posts ${err}`)
                                                forSendBackItemsProcessed++;
                                                //do like 10 load
                                                var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                                if (hasViewedLengthAndNotViewedLength < 10) {
                                                    if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                        sendBack(postsForResponse)
                                                    }
                                                } else {
                                                    //more than 10
                                                    if (postsForResponse.length == 10) {
                                                        sendBack(postsForResponse)
                                                    } else {
                                                        if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                }
                                            })
                                        }
                                    } else {
                                        forSendBackItemsProcessed++;
                                        //do like 10 load
                                        var hasViewedLengthAndNotViewedLength = hasViewedPostsWithRequiredFields.length+hasNotViewedPostsWithRequiredFields.length
                                        if (hasViewedLengthAndNotViewedLength < 10) {
                                            if (forSendBackItemsProcessed == hasViewedLengthAndNotViewedLength) {
                                                sendBack(postsForResponse)
                                            }
                                        } else {
                                            //more than 10
                                            if (postsForResponse.length == 10) {
                                                sendBack(postsForResponse)
                                            } else {
                                                if (forSendBackItemsProcessed == hasViewedPostsWithRequiredFields.length) {
                                                    sendBack(postsForResponse)
                                                }
                                            }
                                        }
                                    }
                                })
                            }

                            if (hasNotViewedPostsWithRequiredFields.length !== 0) {
                                var forSendBackItemsProcessed = 0
                                var postsForResponse = []
                                hasNotViewedPostsWithRequiredFields.forEach(function (item, index) {
                                    //console.log(alreadyOnCurrentFeedIds)
                                    if (alreadyOnCurrentFeedIds.findIndex(x => alreadyOnCurrentFeedIdsChecker(x, hasNotViewedPostsWithRequiredFields[index]._id)) == -1) {
                                        if (hasNotViewedPostsWithRequiredFields[index].format == "Image") {
                                            //image
                                            ImagePost.find({_id: hasNotViewedPostsWithRequiredFields[index]._id}).then(foundImg => {
                                                if (foundImg.length) {
                                                    User.find({_id: foundImg[0].imageCreatorId}).then(postUserFound => {
                                                        if (postUserFound.length) {
                                                            var imageUpVotes = foundImg[0].imageUpVotes.length-foundImg[0].imageDownVotes.length
                                                            var imageUpVoted = false
                                                            if (foundImg[0].imageUpVotes.includes(userFound[0]._id)) {
                                                                imageUpVoted = true
                                                            }
                                                            var imageDownVoted = false
                                                            if (foundImg[0].imageDownVotes.includes(userFound[0]._id)) {
                                                                imageDownVoted = true
                                                            }
                                                            forPush = {
                                                                format: "Image",
                                                                imageId: foundImg[0]._id,
                                                                imageKey: foundImg[0].imageKey,
                                                                imageTitle: foundImg[0].imageTitle,
                                                                imageDescription: foundImg[0].imageDescription,
                                                                imageUpVotes: imageUpVotes,
                                                                imageComments: foundImg[0].imageComments,
                                                                creatorName: postUserFound[0].name,
                                                                creatorDisplayName: postUserFound[0].displayName,
                                                                creatorPfpKey: postUserFound[0].profileImageKey,
                                                                datePosted: foundImg[0].datePosted,
                                                                imageUpVoted: imageUpVoted,
                                                                imageDownVoted: imageDownVoted,
                                                                allowScreenShots: foundImg[0].allowScreenShots,
                                                                hasSeenPosts: false
                                                            }
                                                            postsForResponse.push(forPush)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                        forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                    } else {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            console.log(`Couldn't find user image creator: ${err}`)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                        forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                    } else {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        console.log(`Error finding user image creator: ${err}`)
                                                        forSendBackItemsProcessed++;
                                                        //do like 10 load
                                                        if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                    forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                } else {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        } else {
                                                            //more than 10
                                                            if (postsForResponse.length == 10) {
                                                                sendBack(postsForResponse)
                                                            } else {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        }      
                                                    })
                                                } else {
                                                    console.log("Image couldn't be found with _id")
                                                    forSendBackItemsProcessed++;
                                                    //do like 10 load
                                                    if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                            if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                            } else {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    } else {
                                                        //more than 10
                                                        if (postsForResponse.length == 10) {
                                                            sendBack(postsForResponse)
                                                        } else {
                                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    }
                                                }
                                            }).catch(err => {
                                                //Error finding image posts
                                                console.log(`Error finding image posts ${err}`)
                                                forSendBackItemsProcessed++;
                                                //do like 10 load
                                                if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                        if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                            forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                        } else {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                } else {
                                                    //more than 10
                                                    if (postsForResponse.length == 10) {
                                                        sendBack(postsForResponse)
                                                    } else {
                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                }
                                            })
                                        } else if (hasNotViewedPostsWithRequiredFields[index].format == "Poll") {
                                            //poll
                                            Poll.find({_id: hasNotViewedPostsWithRequiredFields[index]._id}).then(foundPoll => {
                                                if (foundPoll.length) {
                                                    User.find({_id: foundPoll[0].pollCreatorId}).then(postUserFound => {
                                                        if (postUserFound.length) {
                                                            var pollUpOrDownVoted = "Neither";
                                                            var userVotedFor = "None"
                                                            if (foundPoll[0].pollUpVotes.includes(userFound[0]._id)) {
                                                                pollUpOrDownVoted = "UpVoted"
                                                            } else if (foundPoll[0].pollDownVotes.includes(userFound[0]._id)) {
                                                                pollUpOrDownVoted = "DownVoted"
                                                            } else {
                                                                pollUpOrDownVoted = "Neither"
                                                            }
                                                            if (foundPoll[0].optionOnesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "One"
                                                            } else if (foundPoll[0].optionTwosVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Two"
                                                            } else if (foundPoll[0].optionThreesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Three"
                                                            } else if (foundPoll[0].optionFoursVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Four"
                                                            } else if (foundPoll[0].optionFivesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Five"
                                                            } else if (foundPoll[0].optionSixesVotes.includes(userFound[0]._id)){
                                                                userVotedFor = "Six"
                                                            } else {
                                                                userVotedFor = "None"
                                                            }
                                                            //can clean up to get rid of excessive [0]
                                                            const toPush = {
                                                                format: "Poll",
                                                                _id: foundPoll[0]._id,
                                                                pollTitle: foundPoll[0].pollTitle,
                                                                pollSubTitle: foundPoll[0].pollSubTitle,
                                                                optionOne: foundPoll[0].optionOne,
                                                                optionOnesColor: foundPoll[0].optionOnesColor,
                                                                optionOnesVotes: foundPoll[0].optionOnesVotes.length,
                                                                optionTwo: foundPoll[0].optionTwo,
                                                                optionTwosColor: foundPoll[0].optionTwosColor,
                                                                optionTwosVotes: foundPoll[0].optionTwosVotes.length,
                                                                optionThree: foundPoll[0].optionThree,
                                                                optionThreesColor: foundPoll[0].optionThreesColor,
                                                                optionThreesVotes: foundPoll[0].optionThreesVotes.length,
                                                                optionFour: foundPoll[0].optionFour,
                                                                optionFoursColor: foundPoll[0].optionFoursColor,
                                                                optionFoursVotes: foundPoll[0].optionFoursVotes.length,
                                                                optionFive: foundPoll[0].optionFive,
                                                                optionFivesColor: foundPoll[0].optionFivesColor,
                                                                optionFivesVotes: foundPoll[0].optionFivesVotes.length,
                                                                optionSix: foundPoll[0].optionSix,
                                                                optionSixesColor: foundPoll[0].optionSixesColor,
                                                                optionSixesVotes: foundPoll[0].optionSixesVotes.length,
                                                                totalNumberOfOptions: foundPoll[0].totalNumberOfOptions,
                                                                pollUpOrDownVotes: (foundPoll[0].pollUpVotes.length-foundPoll[0].pollDownVotes.length),
                                                                votedFor: userVotedFor,
                                                                pollUpOrDownVoted: pollUpOrDownVoted,
                                                                pollComments: foundPoll[0].pollComments,
                                                                creatorPfpKey: postUserFound[0].profileImageKey,
                                                                creatorName: postUserFound[0].name,
                                                                creatorDisplayName: postUserFound[0].displayName,
                                                                datePosted: foundPoll[0].datePosted,
                                                                allowScreenShots: foundPoll[0].allowScreenShots,
                                                                hasSeenPosts: false
                                                            }
                                                            postsForResponse.push(toPush)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                        forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                    } else {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            console.log(`Couldn't find user poll creator: ${err}`)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                        forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                    } else {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        console.log(`Error finding user poll creator: ${err}`)
                                                        forSendBackItemsProcessed++;
                                                        //do like 10 load
                                                        if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                    forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                } else {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        } else {
                                                            //more than 10
                                                            if (postsForResponse.length == 10) {
                                                                sendBack(postsForResponse)
                                                            } else {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        }
                                                        
                                                    })
                                                } else {
                                                    console.log("Poll couldn't be found with _id")
                                                    forSendBackItemsProcessed++;
                                                    //do like 10 load
                                                    if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                            if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                            } else {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    } else {
                                                        //more than 10
                                                        if (postsForResponse.length == 10) {
                                                            sendBack(postsForResponse)
                                                        } else {
                                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    }
                                                }
                                            }).catch(err => {
                                                //Error finding poll posts
                                                console.log(`Error finding poll posts ${err}`)
                                                forSendBackItemsProcessed++;
                                                //do like 10 load
                                                if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                        if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                            forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                        } else {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                } else {
                                                    //more than 10
                                                    if (postsForResponse.length == 10) {
                                                        sendBack(postsForResponse)
                                                    } else {
                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                }
                                            })
                                        } else {
                                            //thread
                                            Thread.find({_id: hasNotViewedPostsWithRequiredFields[index]._id}).then(foundThread => {
                                                if (foundThread.length) {
                                                    User.find({_id: foundThread[0].creatorId}).then(postUserFound => {
                                                        if (postUserFound.length) {
                                                            var threadType = foundThread[0].threadType
                                                            var threadComments = foundThread[0].threadComments.length
                                                            var threadUpVotes = (foundThread[0].threadUpVotes.length - foundThread[0].threadDownVotes.length)
                                                            var threadTitle =  foundThread[0].threadTitle
                                                            var threadSubtitle = foundThread[0].threadSubtitle
                                                            var threadTags = foundThread[0].threadTags
                                                            var threadCategory = foundThread[0].threadCategory
                                                            var threadBody = foundThread[0].threadBody
                                                            var threadImageKey = foundThread[0].threadImageKey
                                                            var threadImageDescription = foundThread[0].threadImageDescription
                                                            var threadNSFW = foundThread[0].threadNSFW
                                                            var threadNSFL = foundThread[0].threadNSFL
                                                            var datePosted = foundThread[0].datePosted
                                                            var creatorDisplayName = postUserFound[0].displayName
                                                            var creatorName = postUserFound[0].name
                                                            var creatorImageKey = postUserFound[0].profileImageKey
                                                            var allowScreenShots = foundThread[0].allowScreenShots
                                                            var threadUpVoted = false
                                                            var threadDownVoted = false
                                                            if (foundThread[0].threadUpVotes.includes(userFound[0]._id)) {
                                                                console.log("Up voted")
                                                                threadUpVoted = true
                                                                postsForResponse.push({
                                                                    format: "Thread",
                                                                    threadId: foundThread[0]._id,
                                                                    threadComments: threadComments,
                                                                    threadType: threadType,
                                                                    threadUpVotes: threadUpVotes,
                                                                    threadTitle: threadTitle,
                                                                    threadSubtitle: threadSubtitle,
                                                                    threadTags: threadTags,
                                                                    threadCategory: threadCategory,
                                                                    threadBody: threadBody,
                                                                    threadImageKey: threadImageKey,
                                                                    threadImageDescription: threadImageDescription,
                                                                    threadNSFW: threadNSFW,
                                                                    threadNSFL: threadNSFL,
                                                                    datePosted: datePosted,
                                                                    threadUpVoted: threadUpVoted,
                                                                    threadDownVoted: threadDownVoted,
                                                                    creatorDisplayName: creatorDisplayName,
                                                                    creatorName: creatorName,
                                                                    creatorImageKey: creatorImageKey,
                                                                    allowScreenShots: allowScreenShots,
                                                                    hasSeenPosts: false
                                                                })
                                                                forSendBackItemsProcessed++;
                                                                //do like 10 load
                                                                if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                            forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                        } else {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                } else {
                                                                    //more than 10
                                                                    if (postsForResponse.length == 10) {
                                                                        sendBack(postsForResponse)
                                                                    } else {
                                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                }
                                                            } else if (foundThread[0].threadDownVotes.includes(userFound[0]._id)) {
                                                                console.log("Down voted")
                                                                threadDownVoted = true
                                                                postsForResponse.push({
                                                                    format: "Thread",
                                                                    threadId: foundThread[0]._id,
                                                                    threadComments: threadComments,
                                                                    threadType: threadType,
                                                                    threadUpVotes: threadUpVotes,
                                                                    threadTitle: threadTitle,
                                                                    threadSubtitle: threadSubtitle,
                                                                    threadTags: threadTags,
                                                                    threadCategory: threadCategory,
                                                                    threadBody: threadBody,
                                                                    threadImageKey: threadImageKey,
                                                                    threadImageDescription: threadImageDescription,
                                                                    threadNSFW: threadNSFW,
                                                                    threadNSFL: threadNSFL,
                                                                    datePosted: datePosted,
                                                                    threadUpVoted: threadUpVoted,
                                                                    threadDownVoted: threadDownVoted,
                                                                    creatorDisplayName: creatorDisplayName,
                                                                    creatorName: creatorName,
                                                                    creatorImageKey: creatorImageKey,
                                                                    allowScreenShots: allowScreenShots,
                                                                    hasSeenPosts: false
                                                                })
                                                                forSendBackItemsProcessed++;
                                                                //do like 10 load
                                                                if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                            forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                        } else {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                } else {
                                                                    //more than 10
                                                                    if (postsForResponse.length == 10) {
                                                                        sendBack(postsForResponse)
                                                                    } else {
                                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                postsForResponse.push({
                                                                    format: "Thread",
                                                                    threadId: foundThread[0]._id,
                                                                    threadComments: threadComments,
                                                                    threadType: threadType,
                                                                    threadUpVotes: threadUpVotes,
                                                                    threadTitle: threadTitle,
                                                                    threadSubtitle: threadSubtitle,
                                                                    threadTags: threadTags,
                                                                    threadCategory: threadCategory,
                                                                    threadBody: threadBody,
                                                                    threadImageKey: threadImageKey,
                                                                    threadImageDescription: threadImageDescription,
                                                                    threadNSFW: threadNSFW,
                                                                    threadNSFL: threadNSFL,
                                                                    datePosted: datePosted,
                                                                    threadUpVoted: threadUpVoted,
                                                                    threadDownVoted: threadDownVoted,
                                                                    creatorDisplayName: creatorDisplayName,
                                                                    creatorName: creatorName,
                                                                    creatorImageKey: creatorImageKey,
                                                                    allowScreenShots: allowScreenShots,
                                                                    hasSeenPosts: false
                                                                })
                                                                forSendBackItemsProcessed++;
                                                                //do like 10 load
                                                                if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                            forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                        } else {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                } else {
                                                                    //more than 10
                                                                    if (postsForResponse.length == 10) {
                                                                        sendBack(postsForResponse)
                                                                    } else {
                                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                            sendBack(postsForResponse)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            console.log(`Couldn't find user thread creator: ${err}`)
                                                            forSendBackItemsProcessed++;
                                                            //do like 10 load
                                                            if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                        forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                    } else {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            } else {
                                                                //more than 10
                                                                if (postsForResponse.length == 10) {
                                                                    sendBack(postsForResponse)
                                                                } else {
                                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                        sendBack(postsForResponse)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        console.log(`Error finding user thread creator: ${err}`)
                                                        forSendBackItemsProcessed++;
                                                        //do like 10 load
                                                        if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                    forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                                } else {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        } else {
                                                            //more than 10
                                                            if (postsForResponse.length == 10) {
                                                                sendBack(postsForResponse)
                                                            } else {
                                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                    sendBack(postsForResponse)
                                                                }
                                                            }
                                                        }
                                                    })
                                                } else {
                                                    console.log("Thread couldn't be found with _id")
                                                    forSendBackItemsProcessed++;
                                                    //do like 10 load
                                                    if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                            if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                                forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                            } else {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    } else {
                                                        //more than 10
                                                        if (postsForResponse.length == 10) {
                                                            sendBack(postsForResponse)
                                                        } else {
                                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                                sendBack(postsForResponse)
                                                            }
                                                        }
                                                    }
                                                }
                                            }).catch(err => {
                                                //Error finding thread posts
                                                console.log(`Error finding thread posts ${err}`)
                                                forSendBackItemsProcessed++;
                                                //do like 10 load
                                                if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                                    if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                        if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                            forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                        } else {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                } else {
                                                    //more than 10
                                                    if (postsForResponse.length == 10) {
                                                        sendBack(postsForResponse)
                                                    } else {
                                                        if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                            sendBack(postsForResponse)
                                                        }
                                                    }
                                                }
                                            })
                                        }
                                    } else {
                                        forSendBackItemsProcessed++;
                                        //do like 10 load
                                        if (hasNotViewedPostsWithRequiredFields.length < 10) {
                                            if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                if (hasViewedPostsWithRequiredFields.length !== 0) {
                                                    forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                                                } else {
                                                    sendBack(postsForResponse)
                                                }
                                            }
                                        } else {
                                            //more than 10
                                            if (postsForResponse.length == 10) {
                                                sendBack(postsForResponse)
                                            } else {
                                                if (forSendBackItemsProcessed == hasNotViewedPostsWithRequiredFields.length) {
                                                    sendBack(postsForResponse)
                                                }
                                            }
                                        }
                                    }
                                })
                            } else {
                                var forSendBackItemsProcessed = 0
                                var postsForResponse = []
                                forAlreadyViewedOnes(forSendBackItemsProcessed, postsForResponse)
                            }
                        } else {
                            //None at all meaning there is not even viewed ones
                            res.json({
                                status: "FAILED",
                                message: "No posts from anyone this user follows."
                            })
                        }
                    }
                    //
                    let allPostsWithRequiredFieldsPrior = []
                    let itemsProcessed = 0
                    userIsFollowing.forEach(function (item, index) {
                        User.find({secondId: userIsFollowing[index]}).then(userThatsFollowed => {
                            if (userThatsFollowed.length) {
                                //
                                const getImagePosts = (callback) => {
                                    ImagePost.find({imageCreatorId: userThatsFollowed[0]._id}, {datePosted: 1, viewedBy: 1, imageUpVotes: 1, imageDownVotes: 1}).then(imagePostsFound => {
                                        console.log(`imagePostsFound ${imagePostsFound}`)
                                        if (imagePostsFound.length) {
                                            var imagePostsProcessed = 0
                                            var imagePostsFoundForReturn = []
                                            imagePostsFound.forEach(function (item, index) {
                                                if (imagePostsFound[index].imageUpVotes.includes(userFound[0]._id) || imagePostsFound[index].imageDownVotes.includes(userFound[0]._id)) {
                                                    //console.log("Interacted is true")
                                                    imagePostsFoundForReturn.push({viewedBy: imagePostsFound[index].viewedBy, _id: imagePostsFound[index]._id, datePosted: imagePostsFound[index].datePosted, format: "Image", interacted: true})
                                                    imagePostsProcessed++;
                                                    if (imagePostsProcessed == imagePostsFound.length) {
                                                        //console.log(`imagePostsFoundForReturn ${JSON.stringify(imagePostsFoundForReturn)}`)
                                                        return callback(imagePostsFoundForReturn)
                                                    }
                                                } else {
                                                    imagePostsFoundForReturn.push({viewedBy: imagePostsFound[index].viewedBy, _id: imagePostsFound[index]._id, datePosted: imagePostsFound[index].datePosted, format: "Image", interacted: false})
                                                    imagePostsProcessed++;
                                                    if (imagePostsProcessed == imagePostsFound.length) {
                                                        //console.log(`imagePostsFoundForReturn ${JSON.stringify(imagePostsFoundForReturn)}`)
                                                        return callback(imagePostsFoundForReturn)
                                                    }
                                                }
                                            })
                                        } else {
                                            return callback([])
                                        }                                       
                                    }).catch(err => {
                                        console.log(err)
                                        return callback([])
                                    })
                                }
                                //
                                const getPollPosts = (callback) => {
                                    Poll.find({pollCreatorId: userThatsFollowed[0]._id}, {datePosted: 1, viewedBy: 1, pollUpVotes: 1, pollDownVotes: 1}).then(pollPostsFound => {
                                        //console.log(`pollPostsFound ${pollPostsFound}`)
                                        if (pollPostsFound.length) {
                                            var pollPostsProcessed = 0
                                            var pollPostsFoundForReturn = []
                                            pollPostsFound.forEach(function (item, index) {
                                                if (pollPostsFound[index].pollUpVotes.includes(userFound[0]._id) || pollPostsFound[index].pollDownVotes.includes(userFound[0]._id)) {
                                                    //console.log("Interacted is true")
                                                    pollPostsFoundForReturn.push({viewedBy: pollPostsFound[index].viewedBy, _id: pollPostsFound[index]._id, datePosted: pollPostsFound[index].datePosted, format: "Poll", interacted: true})
                                                    pollPostsProcessed++;
                                                    if (pollPostsProcessed == pollPostsFound.length) {
                                                        //console.log(`pollPostsFoundForReturn ${JSON.stringify(pollPostsFoundForReturn)}`)
                                                        return callback(pollPostsFoundForReturn)
                                                    }
                                                } else {
                                                    pollPostsFoundForReturn.push({viewedBy: pollPostsFound[index].viewedBy, _id: pollPostsFound[index]._id, datePosted: pollPostsFound[index].datePosted, format: "Poll", interacted: false})
                                                    pollPostsProcessed++;
                                                    if (pollPostsProcessed == pollPostsFound.length) {
                                                        //console.log(`pollPostsFoundForReturn ${JSON.stringify(pollPostsFoundForReturn)}`)
                                                        return callback(pollPostsFoundForReturn)
                                                    }
                                                }
                                            })
                                        } else {
                                            return callback([])
                                        }
                                    }).catch(err => {
                                        console.log(err)
                                        return callback([])
                                    })
                                }
                                //
                                const getThreadPosts = (callback) => {
                                    Thread.find({creatorId: userThatsFollowed[0]._id}, {datePosted: 1, viewedBy: 1, threadUpVotes: 1, threadDownVotes: 1}).then(threadPostsFound => {
                                        //console.log(`threadPostsFound ${threadPostsFound}`)
                                        if (threadPostsFound.length) {
                                            var threadPostsProcessed = 0
                                            var threadPostsFoundForReturn = []
                                            threadPostsFound.forEach(function (item, index) {
                                                if (threadPostsFound[index].threadUpVotes.includes(userFound[0]._id) || threadPostsFound[index].threadDownVotes.includes(userFound[0]._id)) {
                                                    //console.log("Interacted is true")
                                                    threadPostsFoundForReturn.push({viewedBy: threadPostsFound[index].viewedBy, _id: threadPostsFound[index]._id, datePosted: threadPostsFound[index].datePosted, format: "Thread", interacted: true})
                                                    threadPostsProcessed++;
                                                    if (threadPostsProcessed == threadPostsFound.length) {
                                                        //console.log(`threadPostsFoundForReturn ${JSON.stringify(threadPostsFoundForReturn)}`)
                                                        return callback(threadPostsFoundForReturn)
                                                    }
                                                } else {
                                                    threadPostsFoundForReturn.push({viewedBy: threadPostsFound[index].viewedBy, _id: threadPostsFound[index]._id, datePosted: threadPostsFound[index].datePosted, format: "Thread", interacted: false})
                                                    threadPostsProcessed++;
                                                    if (threadPostsProcessed == threadPostsFound.length) {
                                                        //console.log(`threadPostsFoundForReturn ${JSON.stringify(threadPostsFoundForReturn)}`)
                                                        return callback(threadPostsFoundForReturn)
                                                    }
                                                }
                                            })
                                        } else {
                                            return callback([])
                                        }
                                    }).catch(err => {
                                        console.log(err)
                                        return callback([])
                                    })
                                }
                                //
                                getImagePosts(function(thisUserImages) {
                                    getPollPosts(function(thisUserPoll) {
                                        getThreadPosts(function(thisUserThreads) {
                                            var concatOne = thisUserImages.concat(thisUserPoll)
                                            const thisFollowedUsersPostRequiredFields = concatOne.concat(thisUserThreads)
                                            allPostsWithRequiredFieldsPrior = allPostsWithRequiredFieldsPrior.concat(thisFollowedUsersPostRequiredFields)
                                            //console.log(`allPostsWithRequiredFieldsPrior ${allPostsWithRequiredFieldsPrior}`)
                                            //
                                            itemsProcessed++;
                                            if (itemsProcessed == userIsFollowing.length) {
                                                afterGettingAllPosts(allPostsWithRequiredFieldsPrior)
                                            }
                                        })
                                    })
                                })
                            } else {
                                console.log("Couldnt find user that this user is following.")
                                itemsProcessed++;
                                if (itemsProcessed == userIsFollowing.length) {
                                    afterGettingAllPosts(allPostsWithRequiredFieldsPrior)
                                }
                            }
                        }).catch(err => {
                            console.log(err)
                            itemsProcessed++;
                            if (itemsProcessed == userIsFollowing.length) {
                                afterGettingAllPosts(allPostsWithRequiredFieldsPrior)
                            }
                        })
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "This user doesn't follow any one."
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Couldn't find user, due to incorrect id passed."
                })
            }
        }).catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Error finding user, likely due to a id passed."
            })
        })
    }
})

module.exports = router;
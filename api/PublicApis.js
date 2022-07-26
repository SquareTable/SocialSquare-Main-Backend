const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const mongodb = require('mongodb');
mongoose.set('useFindAndModify', false);

var stringSimilarity = require("string-similarity");

//const { v4: uuidv4 } = require('uuid');

/*
require('dotenv').config();
const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new S3 ({
    region,
    accessKeyId,
    secretAccessKey
})

*/

// mongodb user model
// mongrel mob
const User = require('./../models/User');
const Poll = require('./../models/Poll');
const ImagePost = require('./../models/ImagePost');
const Category = require('./../models/Category');
const Thread = require('./../models/Thread')


//User Api
router.get('/userAPI/:name', (req, res) => {
    try {
        let name = req.params.name
        name = name.trim();

        if (name == "") {
            res.status(400).json({
                status: "FAILED",
                message: "Empty name."
            })
        } else {
            User.find({name: name}).then(userFound => {
                if (userFound.length) {
                    res.json({
                        status: "SUCCESS",
                        message: "Found.",
                        data: {
                            pubId: userFound[0].pubId,
                            profileImageKey: userFound[0].profileImageKey,
                            displayName: userFound[0].displayName,
                            followers: userFound[0].followers.length,
                            following: userFound[0].following.length,
                            badges: userFound[0].badges,
                            privateAccount: userFound[0].privateAccount
                        }
                    })
                } else {
                    res.status(404).json({
                        status: "FAILED",
                        message: "No user found with that name."
                    })
                }
            }).catch(err => {
                console.log(err)
                res.status(500).json({
                    status: "FAILED",
                    message: "Error finding user, likely due to a bad name passed."
                })
            })
        }
    } catch (err) {
            
    }
})

//For Posts
router.get('/postAPI/:name/:postname/:postformat', (req, res) => {
    try {
        let name = req.params.name
        let postName = req.params.postname
        let postformat = req.params.postformat
        name = name.trim();
        postName = postName.trim();
        postformat = postformat.trim();
    
        if (name == "" || postName == "") {
            res.json({
                status: "FAILED",
                message: "Empty input fields!"
            });
        } else {
            const sortSelectSend = (result, format, senderName, senderDisplayName, senderImageKey) => { //gets a list of posts with dates, sorts them, picks the latest, sends them back
                const sortedResult = result.sort(function(a, b){
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
                if (format == "Image") {
                    res.json({
                        status: "SUCCESS",
                        message: "Found",
                        data: {
                            format: format,
                            imageKey: sortedResult[0].imageKey,
                            senderName: senderName,
                            senderDisplayName: senderDisplayName,
                            senderImageKey: senderImageKey,
                            imageTitle: sortedResult[0].imageTitle,
                            imageDescription: sortedResult[0].imageDescription,
                            upVotes: sortedResult[0].imageUpVotes.length,
                            downVotes: sortedResult[0].imageDownVotes.length,
                            datePosted: sortedResult[0].datePosted 
                        }
                    })
                }
            }

            User.find({name: name}).then(userFoundResult => {
                if (userFoundResult.length) {
                    if (userFoundResult[0].privateAccount) {
                        res.status(511).json({
                            status: "SUCCESS",
                            message: "Private Account. Authentication required."
                        })
                        return
                    } else {
                        if (postformat == "Image") {
                            if (postName !== "None") {
                                ImagePost.find({imageCreatorId: userFoundResult[0]._id}).then(imagePostsFound => {
                                    if (imagePostsFound.length) {
                                        var mostSimilarImagePost = null
                                        var mostSimilarImagePostSimilarity = 0
                                        var itemsProcessed = 0
                                        imagePostsFound.forEach(function (item, index) {
                                            var thisSimilarity = stringSimilarity.compareTwoStrings(imagePostsFound[index].imageTitle, postName)
                                            if (mostSimilarImagePostSimilarity > thisSimilarity) {
                                                //less similar
                                                itemsProcessed++;
                                                if (itemsProcessed == imagePostsFound.length) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Found",
                                                        data: {
                                                            similarity: mostSimilarImagePostSimilarity,
                                                            format: "Image",
                                                            imageKey: mostSimilarImagePost.imageKey,
                                                            senderName: userFoundResult[0].senderName,
                                                            senderDisplayName: userFoundResult[0].senderDisplayName,
                                                            senderImageKey: userFoundResult[0].senderImageKey,
                                                            imageTitle: mostSimilarImagePost.imageTitle,
                                                            imageDescription: mostSimilarImagePost.imageDescription,
                                                            upVotes: mostSimilarImagePost.imageUpVotes.length,
                                                            downVotes: mostSimilarImagePost.imageDownVotes.length,
                                                            datePosted: mostSimilarImagePost.datePosted 
                                                        }
                                                    })
                                                }
                                            } else if (mostSimilarImagePostSimilarity == thisSimilarity) {
                                                if (mostSimilarImagePost !== null) {
                                                    dates = [imagePostsFound[index], mostSimilarImagePost]
                                                    const sortedResult = dates.sort(function(a, b){
                                                        var first = a.datePosted.split(" ")[0];
                                                        var second = b.datePosted.split(" ")[0];
                                                        if (first !== second) {
                                                            var aa = first.split('/').reverse().join(),
                                                                bb = second.split('/').reverse().join();
                                                            return aa > bb ? -1 : (aa < bb ? 1 : 0);
                                                        } else {
                                                            var ind11 = a.datePosted.indexOf(' ');
                                                            var ind12 = a.datePosted.indexOf(' ', ind11 + 1);
                                                            var firstTime = a.datePosted.substring(ind12);
                                                            var ind21 = b.datePosted.indexOf(' ');
                                                            var ind22 = b.datePosted.indexOf(' ', ind21 + 1);
                                                            var secondTime = b.datePosted.substring(ind22);
                                                            return firstTime > secondTime ? -1 : (firstTime < secondTime ? 1 : 0);
                                                        }
                                                    });
                                                    if (imagePostsFound[index] == sortedResult[0]) {
                                                        mostSimilarImagePostSimilarity = thisSimilarity
                                                    }
                                                    mostSimilarImagePost = sortedResult[0]
                                                    itemsProcessed++;
                                                    if (itemsProcessed == imagePostsFound.length) {
                                                        res.json({
                                                            status: "SUCCESS",
                                                            message: "Found",
                                                            data: {
                                                                similarity: mostSimilarImagePostSimilarity,
                                                                format: "Image",
                                                                imageKey: mostSimilarImagePost.imageKey,
                                                                senderName: userFoundResult[0].senderName,
                                                                senderDisplayName: userFoundResult[0].senderDisplayName,
                                                                senderImageKey: userFoundResult[0].senderImageKey,
                                                                imageTitle: mostSimilarImagePost.imageTitle,
                                                                imageDescription: mostSimilarImagePost.imageDescription,
                                                                upVotes: mostSimilarImagePost.imageUpVotes.length,
                                                                downVotes: mostSimilarImagePost.imageDownVotes.length,
                                                                datePosted: mostSimilarImagePost.datePosted 
                                                            }
                                                        })
                                                    }
                                                } else {
                                                    mostSimilarImagePost = imagePostsFound[index]
                                                    mostSimilarImagePostSimilarity = thisSimilarity
                                                    itemsProcessed++;
                                                    if (itemsProcessed == imagePostsFound.length) {
                                                        res.json({
                                                            status: "SUCCESS",
                                                            message: "Found",
                                                            data: {
                                                                similarity: mostSimilarImagePostSimilarity,
                                                                format: "Image",
                                                                imageKey: mostSimilarImagePost.imageKey,
                                                                senderName: userFoundResult[0].senderName,
                                                                senderDisplayName: userFoundResult[0].senderDisplayName,
                                                                senderImageKey: userFoundResult[0].senderImageKey,
                                                                imageTitle: mostSimilarImagePost.imageTitle,
                                                                imageDescription: mostSimilarImagePost.imageDescription,
                                                                upVotes: mostSimilarImagePost.imageUpVotes.length,
                                                                downVotes: mostSimilarImagePost.imageDownVotes.length,
                                                                datePosted: mostSimilarImagePost.datePosted 
                                                            }                                    
                                                        })
                                                    }
                                                }
                                            } else {
                                                mostSimilarImagePost = imagePostsFound[index]
                                                mostSimilarImagePostSimilarity = thisSimilarity
                                                itemsProcessed++;
                                                if (itemsProcessed == imagePostsFound.length) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Found",
                                                        data: {
                                                            similarity: mostSimilarImagePostSimilarity,
                                                            format: "Image",
                                                            imageKey: mostSimilarImagePost.imageKey,
                                                            senderName: userFoundResult[0].senderName,
                                                            senderDisplayName: userFoundResult[0].senderDisplayName,
                                                            senderImageKey: userFoundResult[0].senderImageKey,
                                                            imageTitle: mostSimilarImagePost.imageTitle,
                                                            imageDescription: mostSimilarImagePost.imageDescription,
                                                            upVotes: mostSimilarImagePost.imageUpVotes.length,
                                                            downVotes: mostSimilarImagePost.imageDownVotes.length,
                                                            datePosted: mostSimilarImagePost.datePosted 
                                                        }
                                                    })
                                                }
                                            }
                                        })
                                    } else {
                                        res.json({
                                            status: "FAILED",
                                            message: "No image posts found with parameters passed."
                                        })
                                    }
                                }).catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error finding image post"
                                    })
                                })
                            } else {
                                ImagePost.find({imageCreatorId: userFoundResult[0]._id}).then(imagePostsFound => {
                                    if (imagePostsFound.length) {
                                        if (imagePostsFound.length == 1) {
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Found",
                                                data: {
                                                    format: "Image",
                                                    imageKey: imagePostsFound[0].imageKey,
                                                    senderName: userFoundResult[0].senderName,
                                                    senderDisplayName: userFoundResult[0].senderDisplayName,
                                                    senderImageKey: userFoundResult[0].senderImageKey,
                                                    imageTitle: imagePostsFound[0].imageTitle,
                                                    imageDescription: imagePostsFound[0].imageDescription,
                                                    upVotes: imagePostsFound[0].imageUpVotes.length,
                                                    downVotes: imagePostsFound[0].imageDownVotes.length,
                                                    datePosted: imagePostsFound[0].datePosted 
                                                }
                                            })
                                        } else {
                                            //More than 1
                                            sortSelectSend(imagePostsFound, "Image", userFoundResult[0].name, userFoundResult[0].displayName, userFoundResult[0].profileImageKey)
                                        }
                                    } else {
                                        res.json({
                                            status: "FAILED",
                                            message: "No image posts from this user."
                                        })
                                    }
                                })
                            }
                        } else if (postformat == "Poll") {
                            res.status(503).json({
                                status: "FAILED",
                                message: "I just made like image ones now lol noob"
                            })
                        } else if (postformat == "Thread") {
                            res.status(503).json({
                                status: "FAILED",
                                message: "I just made like image ones now lol noob"
                            })
                        } else if (postformat == "Audio") {
                            res.status(503).json({
                                status: "FAILED",
                                message: "I just made like image ones now lol noob"
                            })
                        } else if (postformat == "None") {
                            res.status(503).json({
                                status: "FAILED",
                                message: "I just made like image ones now lol noob"
                            })
                        } else {
                            res.status(503).json({
                                status: "FAILED",
                                message: "Invalid post format supplied"
                            })
                        }
                    }
                } else {
                    res.status(404).json({
                        status: "FAILED",
                        message: "Couldn't find a user with the name provided."
                    })
                }
            }).catch(err => {
                console.log(err)
                res.status(500).json({
                    status: "FAILED",
                    message: "Error checking for user, likely due to name passed."
                })
            })
        }    
    } catch (err) {
        console.log(err);
        res.status(400).json({
            status: "FAILED",
            message: "An error occurred most likely due to paramaters passed!"
        })
    }
})

//Latest posts from category

module.exports = router;
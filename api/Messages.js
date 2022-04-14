const express = require('express');
const router = express.Router();

//Schemas
const Message = require("../models/Message")
const User = require('../models/User');
const Conversation = require('../models/Conversation');

//get latest 20 messages of gc

router.get("/firsttwenty/:conversationId", (req,res)=>{
    Message.find({conversationId: req.params.conversationId}).then(result => { 
        if (result.length) {
            //messages exist
            const allMessagesFound = [];
            var itemsProcessed = 0;
            const afterSort = (afterSorted) => {
                console.log("After sorted")
                for (let index = 0; index < 20; index++) {
                    if (afterSorted.length > index) {
                        if (afterSorted[index].isServerMessage !== true) {
                            User.find({_id: afterSorted[index].senderId}).then(data => {
                                if (data.length) {
                                    var toPush = {
                                        _id: afterSorted[index]._id,
                                        publicId: data[0].secondId,
                                        senderName: data[0].name,
                                        senderImageKey: data[0].profileImageKey,
                                        senderDisplayName: data[0].displayName,
                                        chatText: afterSorted[index].chatText,
                                        isEncrypted: afterSorted[index].isEncrypted,
                                        datePosted: afterSorted[index].datePosted,
                                        dateUpdated: afterSorted[index].dateUpdated,
                                        encryptedChatText: afterSorted[index].encryptedChatText,
                                        involvedIds: afterSorted[index].involvedIds,
                                        isServerMessage: false
                                    }
                                    allMessagesFound.push(toPush)
                                    itemsProcessed++
                                    if (itemsProcessed == 20) {
                                        console.log("allMessagesFound")
                                        console.log(allMessagesFound)
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Messages found.",
                                            data: allMessagesFound
                                        })
                                    }
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "Sender not found."
                                    })
                                }
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error with finding message sender."
                                })
                            })
                        } else {
                            var toPush = {
                                _id: afterSorted[index]._id,
                                publicId: "",
                                senderName: "",
                                senderImageKey: "",
                                senderDisplayName: "",
                                chatText: afterSorted[index].chatText,
                                isEncrypted: afterSorted[index].isEncrypted,
                                datePosted: afterSorted[index].datePosted,
                                dateUpdated: afterSorted[index].dateUpdated,
                                encryptedChatText: "",
                                involvedIds: afterSorted[index].involvedIds,
                                isServerMessage: true
                            }
                            allMessagesFound.push(toPush)
                            itemsProcessed++
                            if (itemsProcessed == 20) {
                                console.log("allMessagesFound")
                                console.log(allMessagesFound)
                                res.json({
                                    status: "SUCCESS",
                                    message: "Messages found.",
                                    data: allMessagesFound
                                })
                            }
                        }
                    } else {
                        // so this is like the actual less than 20 msgs but im still making it iterate 20 times idk why
                        itemsProcessed++;
                        if (itemsProcessed == 20) {
                            console.log("allMessagesFound")
                            console.log(allMessagesFound)
                            res.json({
                                status: "SUCCESS",
                                message: "Messages found.",
                                data: allMessagesFound
                            })
                        }
                    }
                }
            }
            console.log("Before sort")
            if (result.length > 1) {
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
                afterSort(sortedResult)
            } else {
                afterSort(result)
            }
        } else {
            res.json({
                status: "FAILED",
                message: "No messages found."
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error with finding messages."
        })
    })
})

//load 20 more messages of gc

router.get("/loadmore/:conversationId/:lastLoaded", (req,res)=>{
    const lastLoaded = req.params.lastLoaded
    Message.find({conversationId: req.params.conversationId}).then(result => { 
        if (result.length) {
            //messages exist
            const allMessagesFound = [];
            var itemsProcessed = 0;
            const afterSort = (afterSorted) => {
                console.log("After sorted")
                if (lastLoaded == null || typeof lastLoaded == "undefined") {
                    res.json({
                        status: "FAILED",
                        message: "Error with last message loaded passed."
                    })
                } else {
                    const lastLoadedIndex = afterSorted.findIndex(x => x._id == lastLoaded)
                    if (lastLoadedIndex !== -1) {
                        var lastLoadedPosition = lastLoadedIndex + 1
                        if (afterSorted.length - lastLoadedPosition == 0) {
                            res.json({
                                status: "SUCCESS",
                                message: "All messages loaded already"
                            })
                        } else {
                            var LLIPlusTwenty = lastLoadedPosition + 20
                            for (let index = lastLoadedPosition; index <= LLIPlusTwenty; index++) {
                                if (afterSorted[index]) {
                                    console.log(afterSorted[index].datePosted)
                                    if (index <= lastLoadedIndex) {
                                        //before not after last loaded
                                        console.log(`Index was lower than last loaded index ${afterSorted[index].datePosted}`)
                                    } else {
                                        if (afterSorted[index].isServerMessage !== true) {
                                            User.find({_id: afterSorted[index].senderId}).then(data => {
                                                if (data.length) {
                                                    var toPush = {
                                                        _id: afterSorted[index]._id,
                                                        publicId: data[0].secondId,
                                                        senderName: data[0].name,
                                                        senderImageKey: data[0].profileImageKey,
                                                        senderDisplayName: data[0].displayName,
                                                        chatText: afterSorted[index].chatText,
                                                        isEncrypted: afterSorted[index].isEncrypted,
                                                        datePosted: afterSorted[index].datePosted,
                                                        dateUpdated: afterSorted[index].dateUpdated,
                                                        encryptedChatText: afterSorted[index].encryptedChatText,
                                                        involvedIds: afterSorted[index].involvedIds,
                                                        isServerMessage: false
                                                    }
                                                    allMessagesFound.push(toPush)
                                                    itemsProcessed++
                                                    var lastLoadedsNumber = lastLoadedIndex + 1
                                                    if (afterSorted.length - lastLoadedsNumber < 20 ) {
                                                        if (itemsProcessed == afterSorted.length - lastLoadedsNumber) {
                                                            res.json({
                                                                status: "SUCCESS",
                                                                message: "Messages found.",
                                                                data: allMessagesFound
                                                            })
                                                        }
                                                    } else {
                                                        //more than 20 msgs to load
                                                        if (itemsProcessed == 20) {
                                                            res.json({
                                                                status: "SUCCESS",
                                                                message: "Messages found.",
                                                                data: allMessagesFound
                                                            })
                                                        }
                                                    }
                                                } else {
                                                    res.json({
                                                        status: "FAILED",
                                                        message: "Sender not found."
                                                    })
                                                }
                                            }).catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error with finding message sender."
                                                })
                                            })
                                        } else {
                                            var toPush = {
                                                _id: afterSorted[index]._id,
                                                publicId: "",
                                                senderName: "",
                                                senderImageKey: "",
                                                senderDisplayName: "",
                                                chatText: afterSorted[index].chatText,
                                                isEncrypted: afterSorted[index].isEncrypted,
                                                datePosted: afterSorted[index].datePosted,
                                                dateUpdated: afterSorted[index].dateUpdated,
                                                encryptedChatText: "",
                                                involvedIds: afterSorted[index].involvedIds,
                                                isServerMessage: true
                                            }
                                            allMessagesFound.push(toPush)
                                            itemsProcessed++
                                            var lastLoadedsNumber = lastLoadedIndex + 1
                                            if (afterSorted.length - lastLoadedsNumber < 20 ) {
                                                if (itemsProcessed == afterSorted.length - lastLoadedsNumber) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Messages found.",
                                                        data: allMessagesFound
                                                    })
                                                }
                                            } else {
                                                //more than 20 msgs to load
                                                if (itemsProcessed == 20) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Messages found.",
                                                        data: allMessagesFound
                                                    })
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Last loaded message could not be found."
                        })
                    }
                }
            }
            console.log("Before sort")
            const sortedResult = result.sort(function(a, b){
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
            afterSort(sortedResult)
        } else {
            res.json({
                status: "FAILED",
                message: "No messages found."
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error with finding messages."
        })
    })
})

router.post("/addReactionToMessage", (req,res)=> {
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId
    const messageId = req.body.messageId
    const reactionSent = req.body.reactionSent
    User.find({_id: idSent}).then(userFound => {
        if (userFound.length) {
            Message.find({_id: messageId}).then(messageFound => {
                if (messageFound.length) {
                    //check if message is in the right conversation just in case same id or something
                    if (messageFound.length == 1) {
                        if (messageFound[0].conversationId == conversationId) {
                            Message.findOneAndUpdate({_id: messageId}, { $push : { messageReactions: { pubId: idSent, reactionEmoji: reactionSent } }}).then(function() { 
                                res.json({
                                    status: "SUCCESS",
                                    message: "Added Reaction."
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error updating the message."
                                })
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Couldn't finding message."
                            })
                        }
                    } else {
                        var itemsChecked = 0;
                        messageFound.forEach(function (item, index) {
                            if (messageFound[index].conversationId == conversationId) {
                                Message.findOneAndUpdate({_id: messageId}, { $push : { messageReactions: { pubId: idSent, reactionEmoji: reactionSent } }}).then(function() { 
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Added Reaction."
                                    })
                                }).catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error updating the message."
                                    })
                                })
                            } else {
                                itemsChecked++;
                                if (messageFound.length) {
                                    res.json({
                                        status: "FAILED",
                                        message: "Couldn't finding message."
                                    })
                                }
                            }
                        })
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error finding message."
                    })
                }
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

router.post("/removeReactionToMessage", (req,res)=> {
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId
    const messageId = req.body.messageId
    const reactionSent = req.body.reactionSent
    User.find({_id: idSent}).then(userFound => {
        if (userFound.length) {
            Message.find({_id: messageId}).then(messageFound => {
                if (messageFound.length) {
                    //check if message is in the right conversation just in case same id or something
                    if (messageFound.length == 1) {
                        if (messageFound[0].conversationId == conversationId) {
                            Message.findOneAndUpdate({_id: postId}, { $pull: { messageFound : { pubId: idSent, reactionEmoji: reactionSent } }}).then(function(){
                                res.json({
                                    status: "SUCCESS",
                                    message: "Added Reaction."
                                })
                            }).catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "Error updating the message."
                                })
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Couldn't finding message."
                            })
                        }
                    } else {
                        let itemsChecked = 0;
                        messageFound.forEach(function (item, index) {
                            if (messageFound[index].conversationId == conversationId) {
                                Message.findOneAndUpdate({_id: messageId}, { $push : { messageReactions: reactionSent }}).then(function() { 
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Added Reaction."
                                    })
                                }).catch(err => {
                                    console.log(err)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error updating the message."
                                    })
                                })
                            } else {
                                itemsChecked++;
                                if (messageFound.length) {
                                    res.json({
                                        status: "FAILED",
                                        message: "Couldn't finding message."
                                    })
                                }
                            }
                        })
                    }
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Error finding message."
                    })
                }
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

module.exports = router;
// mongodb
require('./config/db')

const app = require('express')();
const port = process.env.PORT || 3000;

const UserRouter = require('./api/User')
const ConversationsRouter = require('./api/Conversations')
const MessagesRouter = require('./api/Messages')
const PublicApisRouter = require('./api/PublicApis')
const FeedRouter = require('./api/Feed')

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

const { v4: uuidv4 } = require('uuid');

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


const { uploadFile, getFileStream } = require('./s3')
const { addSocketToClients, getSocketToSendMessageTo, getSocketToDisconnect, clientConnectedToConversation, removeSocketDueToDisconnect, removeSocketFromClients, checkIfDeviceUUIDConnected } = require('./socketHandler')

var timeOutsOfSocketDisconnects = []

const User = require('./models/User');
const Conversation = require('./models/Conversation')
const Message = require('./models/Message')

function generateTwoDigitDate(callback) {
    //Get date
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
    //
    return callback(datetime)
}

function saveToDataBase(messageSent, convoId, messagesId, callback) {
    //console.log(messageSent)
    User.find({secondId: messageSent.publicId}).then((data) => {
        if (data.length) {
            const userSenderId = data[0]._id
            //User Exists
            Conversation.find({_id: convoId}).then((conversationData) => {
                if (conversationData.length) {
                    //Conversation exists
                    if (messageSent.isEncrypted == true) {
                        console.log(messageSent)
                        if (Array.isArray(messageSent.encryptedChatText)) {
                            const afterCheckIfEmpty = () => {
                                var encryptedChatText = messageSent.encryptedChatText
                                if (encryptedChatText !== null) {
                                    const newMessage = new Message({
                                        _id: messagesId,
                                        conversationId: convoId,
                                        isEncrypted: true,
                                        senderId: userSenderId,
                                        chatText: "",
                                        datePosted: messageSent.datePosted,
                                        dateUpdated: messageSent.dateUpdated,
                                        encryptedChatText: messageSent.encryptedChatText,
                                        isServerMessage: false,
                                        involvedIds: {}
                                    });
                                    newMessage.save().then(result => {
                                        const forReturn = {
                                            status: "SUCCESS",
                                            message: "Sent Message",
                                            data: {
                                                senderName: data[0].name,
                                                senderDisplayName: data[0].displayName,
                                                senderImageKey: data[0].profileImageKey,
                                                isEncrypted: true,
                                                chatText: "",
                                                datePosted: messageSent.datePosted,
                                                dateUpdated: messageSent.dateUpdated,
                                                encryptedChatText: messageSent.encryptedChatText,
                                                isServerMessage: false,
                                                involvedIds: {}
                                            }
                                        }
                                        console.log(`forReturn ${forReturn}`)
                                        return callback(forReturn);
                                    }).catch(err => {
                                        console.log(err)
                                        const forReturn = {
                                            status: "FAILED",
                                            message: "Error with saving message"
                                        }
                                        console.log(`forReturn ${forReturn}`)
                                        return callback(forReturn);
                                    });
                                } else {
                                    const forReturn = {
                                        status: "FAILED",
                                        message: "Message was empty."
                                    }
                                    console.log(`forReturn ${forReturn}`)
                                    return callback(forReturn);
                                }
                            }
                            if (messageSent.encryptedChatText.length !== 0) {
                                var itemsProcessed = 0;
                                messageSent.encryptedChatText.forEach(function (item, index) {
                                    if (messageSent.encryptedChatText[index].encryptedString !== "") {
                                        itemsProcessed++;
                                        if (itemsProcessed == messageSent.encryptedChatText.length) {
                                            afterCheckIfEmpty()
                                        }
                                    } else {
                                        const forReturn = {
                                            status: "FAILED",
                                            message: "Message was empty."
                                        }
                                        console.log(`forReturn ${forReturn}`)
                                        return callback(forReturn);
                                    }
                                })
                            } else {
                                const forReturn = {
                                    status: "FAILED",
                                    message: "No messages sent?"
                                }
                                console.log(`forReturn ${forReturn}`)
                                return callback(forReturn);
                            }
                        } else {
                            const forReturn = {
                                status: "FAILED",
                                message: "Message wasn't correct format for encrypted message."
                            }
                            console.log(`forReturn ${forReturn}`)
                            return callback(forReturn);
                        }
                    } else {
                        //Conversation exists
                        var textInMessage = messageSent.chatText
                        if (textInMessage !== "") {
                            const newMessage = new Message({
                                _id: messagesId,
                                conversationId: convoId,
                                isEncrypted: false,
                                senderId: userSenderId,
                                chatText: messageSent.chatText,
                                datePosted: messageSent.datePosted,
                                dateUpdated: messageSent.dateUpdated,
                                encryptedChatText: ""
                            });
                            newMessage.save().then(result => {
                                const forReturn = {
                                    status: "SUCCESS",
                                    message: "Sent Message",
                                    data: {
                                        senderName: data[0].name,
                                        senderDisplayName: data[0].displayName,
                                        senderImageKey: data[0].profileImageKey,
                                        isEncrypted: false,
                                        chatText: messageSent.chatText,
                                        datePosted: messageSent.datePosted,
                                        dateUpdated: messageSent.dateUpdated,
                                        encryptedChatText: ""
                                    }
                                }
                                console.log(`forReturn ${forReturn}`)
                                return callback(forReturn);
                            }).catch(err => {
                                console.log(err)
                                const forReturn = {
                                    status: "FAILED",
                                    message: "Error with saving message"
                                }
                                console.log(`forReturn ${forReturn}`)
                                return callback(forReturn);
                            });
                        } else {
                            const forReturn = {
                                status: "FAILED",
                                message: "Message was empty."
                            }
                            console.log(`forReturn ${forReturn}`)
                            return callback(forReturn);
                        }
                    }
                } else {
                    const forReturn = {
                        status: "FAILED", 
                        message: "Coundn't find the conversation."
                    }
                    console.log(`forReturn ${forReturn}`)
                    return callback(forReturn);
                }
            }).catch(err => {
                console.log(err)
                const forReturn = {
                    status: "FAILED",
                    message: "Error after finding conversation."
                }
                console.log(`forReturn ${forReturn}`)
                return callback(forReturn);
            })
        } else {
            const forReturn = {
                status: "FAILED",
                message: "Error with user finding."
            }
            console.log(`forReturn ${forReturn}`)
            return callback(forReturn);
        }
    }).catch(err => {
        console.log(err)
        const forReturn = {
            status: "FAILED",
            message: "Error while authenticating user."
        }
        console.log(`forReturn ${forReturn}`)
        return callback(forReturn);
    })
}

function appNotActiveTimeOutForDisconnect(socketIdOfTheUser, pubId) {
    function afterTimeOutIfNotCancelled() {
        try {
            const socketFound = io.sockets.sockets.get(socketIdOfTheUser);
            io.to(socketIdOfTheUser).emit("timed-out-from-app-state")
            socketFound.disconnect()
            console.log(`Timed out from app state socket: ${socketIdOfTheUser}, ${pubId}`)
            const indexToCheckIfTimingOut = timeOutsOfSocketDisconnects.findIndex(x => x.socketIdOfTheUser == socketIdOfTheUser)
            timeOutsOfSocketDisconnects.splice(indexToCheckIfTimingOut, 1)
            console.log(timeOutsOfSocketDisconnects)
        } catch (err) {
            console.log(`Error disconnecting due to app state change: ${err}`)
        }
    }
    var indexIfAlreadyExists = timeOutsOfSocketDisconnects.findIndex(x => x.socketIdOfTheUser == socketIdOfTheUser)
    if (indexIfAlreadyExists == -1) {
        var timeoutID = setTimeout(afterTimeOutIfNotCancelled, 10000)
        timeOutsOfSocketDisconnects.push({socketIdOfTheUser: socketIdOfTheUser, timeoutID: timeoutID})
        console.log(timeOutsOfSocketDisconnects)
    }
}

// Get the objectID type
var ObjectID = require('mongodb').ObjectID;

//For accepting post form data
const bodyParser = require('express').json;
app.use(bodyParser());

app.use('/user', UserRouter)
app.use('/conversations', ConversationsRouter)
app.use('/messages', MessagesRouter)
app.use('/publicApis', PublicApisRouter)
app.use('/feed', FeedRouter)

const https = require('https');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

/*
var server = https.createServer(options, app).listen(port, () => {
    console.log(`Server running on port ${port}`);
});
*/


var server = app.listen(port, () =>  {
    console.log(`Server running on port ${port}`);
})


const io = require("socket.io")(server, {
    cors: { origin: "*" }
});

io.on("connection", (socket) => {
    var idOnConnection = socket.handshake.query.idSentOnConnect
    var uuidOfDevice = socket.handshake.query.uuidOfDevice
    if (idOnConnection) {
        User.find({_id: idOnConnection}).then(userFound => {
            if (userFound.length) {
                if (uuidOfDevice) {
                    checkIfDeviceUUIDConnected(uuidOfDevice, function(alreadyConnected) {
                        const afterRemovingAlreadyConnected = () => {
                            console.log("a user connected")
                            var tempConversation = ""
                            addSocketToClients(userFound[0].secondId, tempConversation, socket.id, uuidOfDevice, function(clientSaved) {
                                console.log(`clientSaved: ${clientSaved}`)
                                socket.emit("client-connected")
                            })
                            // Try the following if doesnt work make it an external function and for the conversation one use a try catch
                            const createdNewObjectId = new ObjectID(idOnConnection)
                            console.log(`Created object id based on sent _id ${createdNewObjectId}`)
                            Conversation.find({members: { $in: [createdNewObjectId]}}).then(conversationsUserIsIn => {
                                if (conversationsUserIsIn.length) {
                                    var itemsProcessed = 0
                                    conversationsUserIsIn.forEach(function (item, index) {
                                        if (conversationsUserIsIn[index].isDirectMessage == true) {
                                            var firstMember = conversationsUserIsIn[index].members[0]
                                            var idOfOther
                                            if (firstMember.equals(createdNewObjectId)) {
                                                idOfOther = conversationsUserIsIn[index].members[1]
                                            } else {
                                                idOfOther = conversationsUserIsIn[index].members[0]
                                            }
                                            console.log(idOfOther)
                                            User.find({_id: idOfOther}).then(foundOtherUser => {
                                                if (foundOtherUser.length) {
                                                    getSocketToSendMessageTo(foundOtherUser[0].secondId, function(socketsToSendTo) {
                                                        if (socketsToSendTo == null || socketsToSendTo.length == 0) {
                                                            console.log("Socket returned was empty or something")
                                                            itemsProcessed++;
                                                            if (itemsProcessed == conversationsUserIsIn.length) {
                                                                socket.emit("fully-set-online")
                                                            }
                                                        } else {
                                                            var socketsSentFromList = 0
                                                            console.log("user-in-conversation-online")
                                                            socketsToSendTo.forEach(function (item, index) {
                                                                try {
                                                                    console.log(`sending socket emit to ${socketsToSendTo[index]}`)
                                                                    io.to(socketsToSendTo[index]).emit("user-in-conversation-online", userFound[0].secondId)
                                                                    socketsSentFromList++;
                                                                    if (socketsSentFromList == socketsToSendTo.length) {
                                                                        itemsProcessed++;
                                                                        if (itemsProcessed == conversationsUserIsIn.length) {
                                                                            socket.emit("fully-set-online")
                                                                        }
                                                                    }
                                                                } catch (err) {
                                                                    console.log(err);
                                                                    itemsProcessed++;
                                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                                        socket.emit("fully-set-online")
                                                                    }
                                                                }
                                                            })
                                                        }
                                                    })
                                                } else {
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        socket.emit("fully-set-online")
                                                    }
                                                }
                                            }).catch(err => {
                                                console.log(err)
                                                itemsProcessed++;
                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                    socket.emit("fully-set-online")
                                                }
                                            })
                                        } else {
                                            try {
                                                var roomExists = io.sockets.adapter.rooms.get(conversationsUserIsIn[index]._id)
                                                if (roomExists == null || roomExists == undefined || typeof roomExists == 'undefined') {
                                                    console.log("Room is empty so didn't send")
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        socket.emit("fully-set-online")
                                                    }
                                                } else {
                                                    socket.to(conversationsUserIsIn[index]._id).emit("user-in-conversation-online", userFound[0].secondId)
                                                    console.log("user-in-conversation-online")
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        socket.emit("fully-set-online")
                                                    }
                                                }
                                            } catch (err) {
                                                console.log(err);
                                                itemsProcessed++;
                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                    socket.emit("fully-set-online")
                                                }
                                            }
                                        }
                                    })
                                } else {
                                    console.log("No conversations to set online for.")
                                }
                            }).catch(err => {
                                console.log(err)
                                socket.emit("error-setting-online-status")
                            })
                        }
                        if (alreadyConnected !== "Not Found") {
                            //Shouldn't need to disconnect it but just incase :)
                            async function forFindingSocketAsync() {
                                try {
                                    const socketFound = await io.sockets.sockets.get(alreadyConnected)
                                    socketFound.disconnect();
                                    console.log(`${alreadyConnected} Disconnected`)
                                    afterRemovingAlreadyConnected()
                                } catch (err) {
                                    console.log("Error disconnecting last socket with this device id should be normal." + err)
                                    afterRemovingAlreadyConnected()
                                }
                            }
                            forFindingSocketAsync()
                        } else {
                            afterRemovingAlreadyConnected()
                        }
                        //
                        socket.on("join-conversation", (conversation, pubId) => {
                            User.find({secondId: pubId}).then(result => {
                                if (result.length) {
                                    const forAsync = () => {
                                        socket.join(conversation)
                                        clientConnectedToConversation(conversation, uuidOfDevice, function(clientSaved) {
                                            console.log(`clientSaved: ${clientSaved}`)
                                            socket.emit("client-joined-conversation")
                                        })
                                    }
                                    forAsync()
                                }
                            }).catch(err => {
                                console.log(err)
                                socket.emit("error-with-room")
                            })
                        })
                        //
                        socket.on("get-online-status-of-user", (pubId) => {
                            getSocketToSendMessageTo(pubId, function(sentBack) { // its just called get socket to send message to
                                if (sentBack == null || sentBack.length == 0) {
                                    socket.emit("user-checked-is-not-online", pubId)
                                } else {
                                    var socketsProcessed = 0
                                    var socketsInSentBackFound = []
                                    sentBack.forEach(function (item, index) {
                                        if (sentBack[index] == undefined || typeof sentBack[index] == 'undefined' || sentBack[index]== null) {
                                            socketsProcessed++;
                                            if (socketsProcessed == sentBack.length) {
                                                if (socketsInSentBackFound.length == 0) {
                                                    socket.emit("user-checked-is-not-online", pubId)
                                                } else {
                                                    socket.emit("user-checked-is-online", pubId)
                                                }
                                            }
                                        } else {
                                            if (io.sockets.sockets[sentBack[index]] !== undefined) {
                                                socketsInSentBackFound.push(sentBack[index])
                                                socketsProcessed++;
                                                if (socketsProcessed == sentBack.length) {
                                                    if (socketsInSentBackFound.length == 0) {
                                                        socket.emit("user-checked-is-not-online", pubId)
                                                    } else {
                                                        socket.emit("user-checked-is-online", pubId)
                                                    }
                                                }
                                            } else {
                                                socketsProcessed++;
                                                if (socketsProcessed == sentBack.length) {
                                                    if (socketsInSentBackFound.length == 0) {
                                                        socket.emit("user-checked-is-not-online", pubId)
                                                    } else {
                                                        socket.emit("user-checked-is-online", pubId)
                                                    }
                                                }
                                            }
                                        }
                                    })
                                }
                            })
                        })
                        //
                        socket.on("send-message", (message) => {
                            if (message.isEncrypted == false) {
                                if (message.chatText.trim() !== "") {
                                    if (message.conversationId !== "") {
                                        if (message.senderId !== "") {
                                            User.find({secondId: message.senderId}).then(result => {
                                                if (result.length) {
                                                    const messagesId = new ObjectID()
                                                    console.log("Message Sending")
                                                    generateTwoDigitDate(function(datetime) {
                                                        var toSendToUsers = {
                                                            _id: messagesId,
                                                            publicId: message.senderId,
                                                            isEncrypted: message.isEncrypted,
                                                            senderName: result[0].name,
                                                            senderImageKey: result[0].profileImageKey,
                                                            senderDisplayName: result[0].displayName,
                                                            chatText: message.chatText,
                                                            encryptedChatText: "",
                                                            datePosted: datetime,
                                                            dateUpdated: datetime,
                                                            isServerMessage: false,
                                                            involvedIds: {}
                                                        }
                                                        socket.to(message.conversationId).emit("recieve-message", toSendToUsers)
                                                        saveToDataBase(toSendToUsers, message.conversationId, messagesId, function(messageSaved) {
                                                            console.log(messageSaved)
                                                            if (messageSaved.status !== "SUCCESS") {
                                                                //second param send is if its encrypted
                                                                socket.emit("error-uploading-message-to-database", messageSaved.message, toSendToUsers, false)
                                                            } else {
                                                                //second param send is if its encrypted
                                                                socket.emit("message-sent-to-database", toSendToUsers, false)
                                                            }
                                                        })
                                                        Conversation.find({_id: message.conversationId}).then(conversationMsgSentTo => {
                                                            if (conversationMsgSentTo.length) {
                                                                var itemsProcessed = 0
                                                                var conversationsUserIsIn = conversationMsgSentTo[0]
                                                                conversationsUserIsIn.members.forEach(function (item, index) {
                                                                    const properIdVersionOfId = new ObjectID(conversationsUserIsIn.members[index])
                                                                    User.find({_id: properIdVersionOfId}).then(foundOtherUser => {
                                                                        if (foundOtherUser.length) {
                                                                            getSocketToSendMessageTo(foundOtherUser[0].secondId, function(socketsToSendTo) {
                                                                                if (socketsToSendTo == null || socketsToSendTo.length == 0) {
                                                                                    console.log("Socket returned was empty or something")
                                                                                    itemsProcessed++;
                                                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                        socket.emit("sent-to-users-out-of-convo")
                                                                                    }
                                                                                } else {
                                                                                    var socketsSentFromList = 0
                                                                                    console.log("sent-to-users-out-of-convo")
                                                                                    socketsToSendTo.forEach(function (item, index) {
                                                                                        try {
                                                                                            console.log(`sending socket emit to ${socketsToSendTo[index]}`)
                                                                                            io.to(socketsToSendTo[index]).emit("message-sent-when-out-of-convo", messagesId, message.conversationId)
                                                                                            socketsSentFromList++;
                                                                                            if (socketsSentFromList == socketsToSendTo.length) {
                                                                                                itemsProcessed++;
                                                                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                                    socket.emit("sent-to-users-out-of-convo")
                                                                                                }
                                                                                            }
                                                                                        } catch (err) {
                                                                                            console.log(err);
                                                                                            itemsProcessed++;
                                                                                            if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                                socket.emit("sent-to-users-out-of-convo")
                                                                                            }
                                                                                        }
                                                                                    })
                                                                                }
                                                                            })
                                                                        } else {
                                                                            itemsProcessed++;
                                                                            if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                socket.emit("sent-to-users-out-of-convo")
                                                                            }
                                                                        }
                                                                    }).catch(err => {
                                                                        console.log(err)
                                                                        itemsProcessed++;
                                                                        if (itemsProcessed == conversationsUserIsIn.length) {
                                                                            socket.emit("sent-to-users-out-of-convo")
                                                                        }
                                                                    })
                                                                })
                                                            } else {
                                                                socket.emit("error-sending-message-to-users-out-of-convo")
                                                            }
                                                        }).catch(err => {
                                                            console.log(err)
                                                            socket.emit("error-sending-message-to-users-out-of-convo")
                                                        })
                                                    })
                                                } else {
                                                    socket.emit("couldnt-find-user")
                                                }
                                            }).catch(err => {
                                                console.log(err)
                                                socket.emit("error-while-finding-user")
                                            })
                                        } else {
                                            socket.emit("no-publicid-passed")
                                        }
                                    } else {
                                        socket.emit("error-with-room")
                                    }
                                } else {
                                    socket.emit("empty-text-sent")
                                }
                            } else {
                                const afterCheckIfEmpty = () => {
                                    if (message.conversationId !== "") {
                                        if (message.senderId !== "") {
                                            User.find({secondId: message.senderId}).then(result => {
                                                if (result.length) {
                                                    const messagesId = new ObjectID()
                                                    console.log("Message Sending")
                                                    generateTwoDigitDate(function(datetime) {
                                                        var toSendToUsers = {
                                                            _id: messagesId,
                                                            publicId: message.senderId,
                                                            isEncrypted: message.isEncrypted,
                                                            senderName: result[0].name,
                                                            senderImageKey: result[0].profileImageKey,
                                                            senderDisplayName: result[0].displayName,
                                                            message: message.chatText,
                                                            chatText: "",
                                                            encryptedChatText: message.encryptedChatText,
                                                            datePosted: datetime,
                                                            dateUpdated: datetime,
                                                            isServerMessage: false,
                                                            involvedIds: {}
                                                        }
                                                        socket.to(message.conversationId).emit("recieve-message", toSendToUsers)
                                                        saveToDataBase(toSendToUsers, message.conversationId, messagesId, function(messageSaved) {
                                                            console.log(messageSaved)
                                                            if (messageSaved.status !== "SUCCESS") {
                                                                //second param send is if its encrypted
                                                                socket.emit("error-uploading-message-to-database", messageSaved.message, toSendToUsers, true)
                                                            } else {
                                                                //second param send is if its encrypted
                                                                socket.emit("message-sent-to-database", toSendToUsers, true)
                                                            }
                                                        })
                                                        Conversation.find({_id: message.conversationId}).then(conversationMsgSentTo => {
                                                            if (conversationMsgSentTo.length) {
                                                                var itemsProcessed = 0
                                                                var conversationsUserIsIn = conversationMsgSentTo[0]
                                                                conversationsUserIsIn.members.forEach(function (item, index) {
                                                                    const properIdVersionOfId = new ObjectID(conversationsUserIsIn.members[index])
                                                                    User.find({_id: properIdVersionOfId}).then(foundOtherUser => {
                                                                        if (foundOtherUser.length) {
                                                                            getSocketToSendMessageTo(foundOtherUser[0].secondId, function(socketsToSendTo) {
                                                                                if (socketsToSendTo == null || socketsToSendTo.length == 0) {
                                                                                    console.log("Socket returned was empty or something")
                                                                                    itemsProcessed++;
                                                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                        socket.emit("sent-to-users-out-of-convo")
                                                                                    }
                                                                                } else {
                                                                                    var socketsSentFromList = 0
                                                                                    console.log("sent-to-users-out-of-convo")
                                                                                    socketsToSendTo.forEach(function (item, index) {
                                                                                        try {
                                                                                            console.log(`sending socket emit to ${socketsToSendTo[index]}`)
                                                                                            io.to(socketsToSendTo[index]).emit("message-sent-when-out-of-convo", messagesId, message.conversationId)
                                                                                            socketsSentFromList++;
                                                                                            if (socketsSentFromList == socketsToSendTo.length) {
                                                                                                itemsProcessed++;
                                                                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                                    socket.emit("sent-to-users-out-of-convo")
                                                                                                }
                                                                                            }
                                                                                        } catch (err) {
                                                                                            console.log(err);
                                                                                            itemsProcessed++;
                                                                                            if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                                socket.emit("sent-to-users-out-of-convo")
                                                                                            }
                                                                                        }
                                                                                    })
                                                                                }
                                                                            })
                                                                        } else {
                                                                            itemsProcessed++;
                                                                            if (itemsProcessed == conversationsUserIsIn.length) {
                                                                                socket.emit("sent-to-users-out-of-convo")
                                                                            }
                                                                        }
                                                                    }).catch(err => {
                                                                        console.log(err)
                                                                        itemsProcessed++;
                                                                        if (itemsProcessed == conversationsUserIsIn.length) {
                                                                            socket.emit("sent-to-users-out-of-convo")
                                                                        }
                                                                    })
                                                                })
                                                            } else {
                                                                socket.emit("error-sending-message-to-users-out-of-convo")
                                                            }
                                                        }).catch(err => {
                                                            console.log(err)
                                                            socket.emit("error-sending-message-to-users-out-of-convo")
                                                        })
                                                    })
                                                } else {
                                                    socket.emit("couldnt-find-user")
                                                }
                                            }).catch(err => {
                                                console.log(err)
                                                socket.emit("error-while-finding-user")
                                            })
                                        } else {
                                            socket.emit("no-publicid-passed")
                                        }
                                    } else {
                                        socket.emit("error-with-room")
                                    }
                                }
                                var itemsProcessed = 0;
                                message.encryptedChatText.forEach(function (item, index) {
                                    if (message.encryptedChatText[index].encryptedString !== "") {
                                        if (itemsProcessed < message.encryptedChatText.length)  {
                                            itemsProcessed++
                                            if (itemsProcessed == message.encryptedChatText.length) {
                                                afterCheckIfEmpty()
                                            }
                                        }
                                    } else {
                                        socket.emit("empty-text-sent")
                                        itemsProcessed = message.encryptedChatText.length + 1
                                    }
                                })
                            }
                        })
                        //
                        socket.on('viewed-message', (conversationId, secondId, messagesId, msgDate) => {
                            Conversation.find({_id: conversationId}).then(convoFound => {
                                if (convoFound.length) {
                                    const indexOfLastMessageSeen = convoFound[0].lastMessageViewed.findIndex(x => x.messageViewedId == messagesId && x.userThatViewed == secondId)
                                    if (indexOfLastMessageSeen !== -1) {
                                        //Message viewed already in database
                                        socket.to(conversationId).emit("seen-message", secondId, messagesId)
                                    } else {
                                        if (typeof msgDate === 'string' || msgDate instanceof String) {
                                            if (msgDate !== "") {
                                                generateTwoDigitDate(function(currentDate) {
                                                    const foundIndexOfIfUserHasSeenAMsg = convoFound[0].lastMessageViewed.findIndex(x => x.userThatViewed == secondId)
                                                    if (foundIndexOfIfUserHasSeenAMsg !== -1) {
                                                        if (typeof convoFound[0].lastMessageViewed[foundIndexOfIfUserHasSeenAMsg] === 'undefined') {
                                                            Conversation.findOneAndUpdate({_id: conversationId}, { $pull: { lastMessageViewed: { userThatViewed: secondId }}}).then(function() {
                                                                Conversation.findOneAndUpdate({_id: conversationId}, { $push: { lastMessageViewed: { userThatViewed: secondId, messageViewedId: messagesId, dateOfMessage: msgDate }}}).then(function() {
                                                                    console.log("Seen")
                                                                }).catch(err => {
                                                                    console.log(err)
                                                                    socket.emit("error-marking-message-as-seen")
                                                                })
                                                            }).catch(err => {
                                                                console.log(err)
                                                                socket.emit("error-marking-message-as-seen")
                                                            })
                                                        } else {
                                                            twoDates = [msgDate, currentDate, convoFound[0].lastMessageViewed[foundIndexOfIfUserHasSeenAMsg].dateOfMessage]
                                                            const sortedResult = twoDates.sort(function(a, b){
                                                                try {
                                                                    var first = a.split(" ")[0];
                                                                    var second = b.split(" ")[0];
                                                                    if (first !== second) {
                                                                        var aa = first.split('/').reverse().join(),
                                                                        bb = second.split('/').reverse().join();
                                                                        return aa > bb ? -1 : (aa > bb ? 1 : 0);
                                                                    } else {
                                                                        var ind11 = a.indexOf(' ');
                                                                        var ind12 = a.indexOf(' ', ind11 + 1);
                                                                        var firstTime = a.substring(ind12);
                                                                        var ind21 = b.indexOf(' ');
                                                                        var ind22 = b.indexOf(' ', ind21 + 1);
                                                                        var secondTime = b.substring(ind22);
                                                                        return firstTime > secondTime ? -1 : (firstTime > secondTime ? 1 : 0);
                                                                    }
                                                                } catch(err) {
                                                                    console.log("Error comparing dates probably an issue with msgDate sent")
                                                                    console.log(err)
                                                                    socket.emit("error-marking-message-as-seen")
                                                                }
                                                            });
    
                                                            if (sortedResult[0] == currentDate) {
                                                                //compare users latest seen messages date with the one they are attempting to set as latest
                                                                if (sortedResult[1] == msgDate) {
                                                                    Conversation.findOneAndUpdate({_id: conversationId}, { $pull: { lastMessageViewed: { userThatViewed: secondId }}}).then(function() {
                                                                        Conversation.findOneAndUpdate({_id: conversationId}, { $push: { lastMessageViewed: { userThatViewed: secondId, messageViewedId: messagesId, dateOfMessage: msgDate }}}).then(function() {
                                                                            console.log("Seen")
                                                                        }).catch(err => {
                                                                            console.log(err)
                                                                            socket.emit("error-marking-message-as-seen")
                                                                        })
                                                                    }).catch(err => {
                                                                        console.log(err)
                                                                        socket.emit("error-marking-message-as-seen")
                                                                    })
                                                                } else {
                                                                    console.log("Seen a more later msg")
                                                                }
                                                            } else {
                                                                console.log("Time of message seen is before the current time")
                                                                socket.emit("error-marking-message-as-seen")
                                                            }
                                                        }
                                                    } else {
                                                        twoDates = [msgDate, currentDate]
                                                        const sortedResult = twoDates.sort(function(a, b){
                                                            try {
                                                                var first = a.split(" ")[0];
                                                                var second = b.split(" ")[0];
                                                                if (first !== second) {
                                                                    var aa = first.split('/').reverse().join(),
                                                                    bb = second.split('/').reverse().join();
                                                                    return aa > bb ? -1 : (aa > bb ? 1 : 0);
                                                                } else {
                                                                    var ind11 = a.indexOf(' ');
                                                                    var ind12 = a.indexOf(' ', ind11 + 1);
                                                                    var firstTime = a.substring(ind12);
                                                                    var ind21 = b.indexOf(' ');
                                                                    var ind22 = b.indexOf(' ', ind21 + 1);
                                                                    var secondTime = b.substring(ind22);
                                                                    return firstTime > secondTime ? -1 : (firstTime > secondTime ? 1 : 0);
                                                                }
                                                            } catch(err) {
                                                                console.log("Error comparing dates probably an issue with msgDate sent")
                                                                console.log(err)
                                                                socket.emit("error-marking-message-as-seen")
                                                            }
                                                        });
    
                                                        console.log("sortedResult:")
                                                        console.log(sortedResult)
    
                                                        if (sortedResult[0] == currentDate) {
                                                            Conversation.findOneAndUpdate({_id: conversationId}, { $push: { lastMessageViewed: { userThatViewed: secondId, messageViewedId: messagesId, dateOfMessage: msgDate }}}).then(function() {
                                                                console.log("Seen")
                                                            }).catch(err => {
                                                                console.log(err)
                                                                socket.emit("error-marking-message-as-seen")
                                                            })
                                                        } else {
                                                            console.log("Time of message seen is before the current time")
                                                            socket.emit("error-marking-message-as-seen")
                                                        }
                                                    }
                                                })                                                
                                            } else {
                                                console.log("Empty msg date sent")
                                                socket.emit("error-marking-message-as-seen")
                                            }
                                        } else {
                                            console.log("Error with msg date sent")
                                            socket.emit("error-marking-message-as-seen")
                                        }
                                    }
                                } else {
                                    socket.emit("couldnt-find-conversation")
                                }
                            }).catch(err => {
                                console.log(err)
                                socket.emit("error-while-finding-conversation")
                            })
                        })
                        //
                        socket.on('added-reaction', (secondId, messagesId, conversationId, reactionSent) => {
                            socket.to(conversationId).emit("added-reaction", secondId, messagesId, reactionSent)
                        })
                        socket.on('remove-reaction', (secondId, messagesId, conversationId, reactionSent) => {
                            socket.to(conversationId).emit("remove-reaction", secondId, messagesId, reactionSent)
                        })
                        socket.on('app-state-active', () => {
                            const indexToCheckIfTimingOut = timeOutsOfSocketDisconnects.findIndex(x => x.socketIdOfTheUser == socket.id)
                            if (indexToCheckIfTimingOut !== -1) {
                                try {
                                    console.log(`Clearing timeout ${socket.id}`)
                                    clearTimeout(timeOutsOfSocketDisconnects[indexToCheckIfTimingOut].timeoutID)
                                    timeOutsOfSocketDisconnects.splice(indexToCheckIfTimingOut, 1)
                                } catch (err) {
                                    console.log(err)
                                }
                            }
                        })
                        socket.on('app-state-not-active', () => {
                            appNotActiveTimeOutForDisconnect(socket.id, userFound[0].secondId)
                        })
                        socket.on('disconnect', ()=> {
                            removeSocketDueToDisconnect(uuidOfDevice, function(removeSocket) {
                                console.log('A disconnection has been made')
                                if (removeSocket.status == "FAILED") {
                                    console.log("Error removing socket.")
                                }
                                // Set user offline
                                const CreatedNewObjectIdForSetOffline = new ObjectID(idOnConnection)
                                console.log(CreatedNewObjectIdForSetOffline)
                                Conversation.find({members: { $in: [CreatedNewObjectIdForSetOffline]}}).then(conversationsUserIsIn => {
                                    if (conversationsUserIsIn.length) {
                                        var itemsProcessed = 0
                                        conversationsUserIsIn.forEach(function (item, index) {
                                            if (conversationsUserIsIn[index].isDirectMessage == true) {
                                                var firstMember = conversationsUserIsIn[index].members[0]
                                                var idOfOther
                                                if (firstMember.equals(CreatedNewObjectIdForSetOffline)) {
                                                    idOfOther = conversationsUserIsIn[index].members[1]
                                                } else {
                                                    idOfOther = conversationsUserIsIn[index].members[0]
                                                }
                                                User.find({_id: idOfOther}).then(otherUserFind => {
                                                    if (otherUserFind.length) { 
                                                        getSocketToSendMessageTo(otherUserFind[0].secondId, function(socketsToSendTo) {
                                                            if (socketsToSendTo == null || socketsToSendTo.length == 0) {
                                                                console.log("Socket returned was empty or something")
                                                                itemsProcessed++;
                                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                                    socket.emit("fully-set-offline")
                                                                }
                                                            } else {
                                                                var socketsSentFromList = 0
                                                                socketsToSendTo.forEach(function (item, index) {
                                                                    io.to(socketsToSendTo[index]).emit("user-in-conversation-offline", userFound[0].secondId)
                                                                    console.log("user-in-conversation-offline")
                                                                    socketsSentFromList++;
                                                                    if (socketsSentFromList == socketsToSendTo.length) {
                                                                        itemsProcessed++;
                                                                        if (itemsProcessed == conversationsUserIsIn.length) {
                                                                            socket.emit("fully-set-offline")
                                                                        }
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    } else {

                                                    }
                                                }).catch(err => {
                                                    console.log(err)
                                                    socket.emit("error-setting-offline-status") 
                                                })
                                            } else {
                                                var roomExists = io.sockets.adapter.rooms.get(conversationsUserIsIn[index]._id)
                                                if (roomExists == null || roomExists == undefined || typeof roomExists == 'undefined') {
                                                    console.log("Room is empty so didn't send")
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        socket.emit("fully-set-offline")
                                                    }
                                                } else {
                                                    socket.to(conversationsUserIsIn[index]._id).emit("user-in-conversation-offline", userFound[0].secondId)
                                                    console.log("user-in-conversation-offline")
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        socket.emit("fully-set-offline")
                                                    }
                                                }
                                            }
                                        })
                                    } else {
                                        console.log("No conversations to set offline for.")
                                    }
                                }).catch(err => {
                                    console.log(err)
                                    socket.emit("error-setting-offline-status")
                                })
                                //
                            })
                        })
                    })
                } else {
                    console.log("No device uuid sent")
                    socket.disconnect()
                }
            } else {
                console.log("No _id sent")
                socket.disconnect()
            }
        }).catch(err => {
            console.log(err)
            //probs change from disconnect to something else
            socket.disconnect()
        })
    } else {
        console.log("No user id sent")
        socket.disconnect()
    }
})

const serverMessage = (convoId, chatText, involvedIds, _id, datetime) => {
    const newMessage = new Message({
        _id: _id,
        conversationId: convoId,
        isEncrypted: false,
        senderId: "",
        chatText: chatText,
        datePosted: datetime,
        dateUpdated: datetime,
        encryptedChatText: "",
        isServerMessage: true,
        involvedIds: involvedIds
    });
    newMessage.save().then(result => {
        return result;
    }).catch(err => {
        console.log(err)
        return "FAILED"
    });
}

app.post("/leaveConversations", (req, res) => {
    //passed values
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId

    //main
    if (idSent == "" || conversationId == "") {
        res.json({
            status: "FAILED",
            message: "Issue with ids sent"
        })
    } else {
        User.find({_id: idSent}).then(userFound => {
            if (userFound.length) {
                Conversation.find({_id: conversationId}).then(convoFound => {
                    if (convoFound.length) {
                        if (convoFound[0].isDirectMessage !== true) {
                            if (convoFound[0].members.includes(idSent)) {
                                if (convoFound[0].members.length !== 1) {
                                    const idToTest = new ObjectID(idSent)
                                    const ownerIdToTest = new ObjectID(convoFound[0].ownerId)
                                    if (idToTest.equals(ownerIdToTest)) {
                                        res.json({
                                            status: "FAILED",
                                            message: "Please assign an owner before leaving."
                                        })
                                    } else {
                                        Conversation.findOneAndUpdate({_id: conversationId}, { $pull: { members: idToTest }}).then(function() { 
                                            console.log("Updated")
                                            getSocketToDisconnect(conversationId, idSent, function(toLeave) {
                                                if (toLeave == null || toLeave.length == 0) {
                                                    const serverMessagesId = new ObjectID()
                                                    //Get date
                                                    generateTwoDigitDate(function(datetime) {
                                                        io.sockets.in(conversationId).emit("user-left-conversation", userFound[0].secondId, serverMessagesId, datetime);
                                                        serverMessage(conversationId, "Left", {userThatLeft: userFound[0].secondId}, serverMessagesId, datetime)
                                                        res.json({
                                                            status: "SUCCESS",
                                                            message: "Successfully left.",
                                                        })
                                                    })
                                                } else {
                                                    var toLeaveItemsProcessed = 0
                                                    toLeave.forEach(function (item, index) {
                                                        const forAsync = async () => {
                                                            const socketFound = await io.sockets.sockets.get(toLeave[index])
                                                            socketFound.leave(conversationId);
                                                            toLeaveItemsProcessed++;
                                                            if (toLeaveItemsProcessed == toLeave.length) {
                                                                removeSocketFromClients(conversationId, userFound[0].secondId, function(socketRemoving) {
                                                                    if (socketRemoving !== null) {
                                                                        console.log("Socket removed from array")
                                                                        const serverMessagesId = new ObjectID()
                                                                        generateTwoDigitDate(function(datetime) {
                                                                            io.sockets.in(conversationId).emit("user-left-conversation", userFound[0].secondId, serverMessagesId, datetime);
                                                                            serverMessage(conversationId, "Left", {userThatLeft: userFound[0].secondId}, serverMessagesId, datetime)
                                                                            res.json({
                                                                                status: "SUCCESS",
                                                                                message: "Successfully left.",
                                                                            })
                                                                        })
                                                                    } else {
                                                                        console.log("Didn't remove from array")
                                                                        const serverMessagesId = new ObjectID()
                                                                        generateTwoDigitDate(function(datetime) {
                                                                            io.sockets.in(conversationId).emit("user-left-conversation", userFound[0].secondId, serverMessagesId, datetime);
                                                                            serverMessage(conversationId, "Left", {userThatLeft: userFound[0].secondId}, serverMessagesId, datetime)
                                                                            res.json({
                                                                                status: "SUCCESS",
                                                                                message: "Successfully left.",
                                                                            })
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        }
                                                        forAsync()
                                                    })  
                                                }
                                            })
                                        }).catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error leaving."
                                            })
                                        })
                                    }
                                } else {
                                    const conversationIdString = conversationId.toString()
                                    Message.remove({conversationId: conversationIdString}).then(function() {
                                        Conversation.findOneAndDelete({_id: conversationId}).then(function() {
                                            getSocketToDisconnect(conversationId, idSent, function(toLeave) {
                                                if (toLeave == null || toLeave.length == 0) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Successfully left.",
                                                    })
                                                } else {
                                                    var toLeaveItemsProcessed = 0
                                                    toLeave.forEach(function (item, index) {
                                                        const forAsync = async () => {
                                                            const socketFound = await io.sockets.sockets.get(toLeave[index])
                                                            socketFound.leave(conversationId);
                                                            toLeaveItemsProcessed++;
                                                            if (toLeaveItemsProcessed == toLeave.length) {
                                                                const socketFound = io.sockets.sockets.get(toLeave)
                                                                socketFound.leave(conversationId);                                                
                                                                removeSocketFromClients(conversationId, userFound[0].secondId, function(socketRemoving) {
                                                                    if (socketRemoving !== null) {
                                                                        console.log("Socket removed from array")
                                                                        res.json({
                                                                            status: "SUCCESS",
                                                                            message: "Successfully left.",
                                                                        })
                                                                    } else {
                                                                        console.log("Didn't remove from array")
                                                                        res.json({
                                                                            status: "SUCCESS",
                                                                            message: "Successfully left.",
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        }
                                                        forAsync()
                                                    })
                                                }
                                            })
                                        }).catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error when deleting conversations."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when deleting messages."
                                        })
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Your not in the conversation"
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "You cant leave DMs"
                            })
                        }
                    }
                }).catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "Error when deleting messages."
                    })
                })
            }
        }).catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Error when deleting messages."
            })
        })
    }    
})

//remove from gc
app.post("/removeMember", (req,res) => {
    //sent
    const sentId = req.body.sentId
    const conversationId = req.body.conversationId
    const pubIdOfUserToRemove = req.body.pubIdOfUserToRemove
    
    //main
    if (sentId == "" || conversationId == "" || pubIdOfUserToRemove == "") {
        res.json({
            status: "FAILED",
            message: "Error with params passed"
        })
    } else {    
        User.find({_id: sentId}).then(thisUsersData => {
            if (thisUsersData.length) {
                User.find({secondId: pubIdOfUserToRemove}).then(toRemoveUsersData => {
                    if (toRemoveUsersData.length) {
                        Conversation.find({_id: conversationId}).then(convoData => {
                            if (convoData.length) {
                                if (convoData[0].isDirectMessage == false) {
                                    if (sentId == new ObjectID(convoData[0].ownerId)) {
                                        if (sentId !== toRemoveUsersData) {
                                            if (convoData[0].members.includes(toRemoveUsersData[0]._id)) {
                                                Conversation.findOneAndUpdate({_id: conversationId}, { $pull: { members: toRemoveUsersData[0]._id }}).then(function() { 
                                                    console.log("Updated")
                                                    getSocketToDisconnect(conversationId, pubIdOfUserToRemove, function(toLeave) {
                                                        if (toLeave == null || toLeave.length == 0) {
                                                            const serverMessagesId = new ObjectID()
                                                            generateTwoDigitDate(function(datetime) {
                                                                io.sockets.in(conversationId).emit("user-kicked", thisUsersData[0].secondId, toRemoveUsersData[0].secondId, serverMessagesId, datetime)
                                                                serverMessage(conversationId, "User Kicked", {userThatKicked: thisUsersData[0].secondId, userThatGotKicked: toRemoveUsersData[0].secondId}, serverMessagesId, datetime)
                                                                res.json({
                                                                    status: "SUCCESS",
                                                                    message: "Successfully removed user.",
                                                                    data: {pubId: toRemoveUsersData[0].secondId}
                                                                })
                                                            })
                                                        } else {
                                                            var toLeaveItemsProcessed = 0
                                                            toLeave.forEach(function (item, index) {
                                                                const forAsync = async () => {
                                                                    const socketFound = await io.sockets.sockets.get(toLeave[index])
                                                                    socketFound.emit("removed-from-convo")
                                                                    socketFound.leave(conversationId);
                                                                    toLeaveItemsProcessed++;
                                                                    if (toLeaveItemsProcessed == toLeave.length) {
                                                                        removeSocketFromClients(conversationId, toRemoveUsersData[0].secondId, function(socketRemoving) {
                                                                            if (socketRemoving !== null) {
                                                                                console.log("Socket removed from array")
                                                                                const serverMessagesId = new ObjectID()
                                                                                generateTwoDigitDate(function(datetime) {
                                                                                    io.sockets.in(conversationId).emit("user-kicked", thisUsersData[0].secondId, toRemoveUsersData[0].secondId, serverMessagesId, datetime)
                                                                                    serverMessage(conversationId, "User Kicked", {userThatKicked: thisUsersData[0].secondId, userThatGotKicked: toRemoveUsersData[0].secondId}, serverMessagesId, datetime)
                                                                                    res.json({
                                                                                        status: "SUCCESS",
                                                                                        message: "Successfully removed user.",
                                                                                        data: {pubId: toRemoveUsersData[0].secondId}
                                                                                    })
                                                                                })
                                                                            } else {
                                                                                console.log("Didn't remove from array")
                                                                                const serverMessagesId = new ObjectID()
                                                                                generateTwoDigitDate(function(datetime) {
                                                                                    io.sockets.in(conversationId).emit("user-kicked", thisUsersData[0].secondId, toRemoveUsersData[0].secondId, serverMessagesId, datetime)
                                                                                    serverMessage(conversationId, "User Kicked", {userThatKicked: thisUsersData[0].secondId, userThatGotKicked: toRemoveUsersData[0].secondId}, serverMessagesId, datetime)
                                                                                    res.json({
                                                                                        status: "SUCCESS",
                                                                                        message: "Successfully removed user.",
                                                                                        data: {pubId: toRemoveUsersData[0].secondId}
                                                                                    })
                                                                                })
                                                                            }
                                                                        })
                                                                    }
                                                                }
                                                                forAsync()
                                                            })
                                                        }
                                                    })
                                                }).catch(err => {
                                                    console.log(err)
                                                    res.json({
                                                        status: "FAILED",
                                                        message: "Error occured while updating members."
                                                    })
                                                })
                                            } else {
                                                res.json({
                                                    status: "FAILED",
                                                    message: "User is not in conversation."
                                                })
                                            }
                                        } else {
                                            res.json({
                                                status: "FAILED",
                                                message: "Cant kick yourself, try leave instead."
                                            })
                                        }
                                    } else {
                                        res.json({
                                            status: "FAILED",
                                            message: "Only the owner can do this."
                                        })
                                    }
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "You cant remove members from a dm."
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Couldn't find the conversation?"
                                })
                            }
                        })
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find user to add."
                        })
                    }
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Error with user id passed."
                })
            }
        })
    }
})

//Toggle screenshots allowed
app.post("/changeGroupName", (req, res) => {
    //passed data
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId
    const newName = req.body.newName

    //main
    if (idSent == "" || conversationId == "" || newName == "" || typeof newName !== "string") {
        res.json({
            status: "FAILED",
            message: "Issue with params sent"
        })
    } else {
        if (newName.length <= 25) {
            User.find({_id: idSent}).then(userFound => {
                if (userFound.length) {
                    Conversation.find({_id: conversationId}).then(convoFound => {
                        if (convoFound.length) {
                            if (convoFound[0].isDirectMessage == false) {
                                if (convoFound[0].conversationTitle !== newName) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {conversationTitle: newName}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("new-title", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "New Title", {userThatChangedIt: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Changed group name.",
                                                data: newName
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "This is already the name."
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant update the name of a dm."
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Issue finding conversation."
                            })
                    }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Couldn't find user."
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "That's too long~"
            }) 
        }
    }
})

//Toggle screenshots allowed
app.post("/changeGroupDescription", (req, res) => {
    //passed data
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId
    const newDescription = req.body.newDescription

    //main
    if (idSent == "" || conversationId == "" || newDescription == "" || typeof newDescription !== "string") {
        res.json({
            status: "FAILED",
            message: "Issue with params sent"
        })
    } else {
        if (newDescription.length <= 180) {
            User.find({_id: idSent}).then(userFound => {
                if (userFound.length) {
                    Conversation.find({_id: conversationId}).then(convoFound => {
                        if (convoFound.length) {
                            if (convoFound[0].isDirectMessage == false) {
                                if (convoFound[0].conversationDescription !== newDescription) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {conversationDescription: newDescription}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                        io.sockets.in(conversationId).emit("new-description", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "New Description", {userThatChangedIt: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Changed group description.",
                                                data: newDescription
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "This is already the description."
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "You cant update the description of a dm."
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Issue finding conversation."
                            })
                    }
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Couldn't find user."
                    })
                }
            })
        } else {
            res.json({
                status: "FAILED",
                message: "That's too long~"
            }) 
        }
    }
})

//Toggle screenshots allowed
app.post("/toggleScreenshotsAllowed", (req, res) => {
    //passed data
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId

    //main
    if (idSent == "" || conversationId == "") {
        res.json({
            status: "FAILED",
            message: "Issue with ids sent"
        })
    } else {
        User.find({_id: idSent}).then(userFound => {
            if (userFound.length) {
                Conversation.find({_id: conversationId}).then(convoFound => {
                    if (convoFound.length) {
                        if (convoFound[0].isDirectMessage == false) {
                            if (idSent == new ObjectID(convoFound[0].ownerId)) {
                                if (convoFound[0].allowScreenShots == true) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {allowScreenShots: false}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("screenshots-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Screenshots Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned screenshots off."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {allowScreenShots: true}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("screenshots-toggled-on", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Screenshots On", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned screenshots on."
                                            })
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
                                    message: "Only the owner can do this."
                                })
                            }
                        } else {
                            if (idSent == new ObjectID(convoFound[0].members[0])) {
                                if (convoFound[0].allowScreenshots == true) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {allowScreenshots: false}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("screenshots-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Screenshots Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned screenshots off."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {allowScreenshots: true}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("screenshots-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Screenshots Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned screenshots on."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                }
                            } else if (idSent == new ObjectID(convoFound[0].members[1])) {
                                if (convoFound[0].allowScreenshots == true) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {allowScreenshots: false}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("screenshots-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Screenshots Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned screenshots off."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {allowScreenshots: true}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("screenshots-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Screenshots Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned screenshots on."
                                            })
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
                                    message: "Error finding you in the dm."
                                })
                            }
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Issue finding conversation."
                        })
                   }
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Couldn't find user."
                })
            }
        })
    }
})

//Toggle conversation encryption

app.post("/toggleConversationEncryption", (req,res) => {
    //passed data
    const idSent = req.body.idSent
    const conversationId = req.body.conversationId
    
    //main
    if (idSent == "" || conversationId == "") {
        res.json({
            status: "FAILED",
            message: "Error with params passed"
        })
    } else {    
        User.find({_id: idSent}).then(userFound => {
            if (userFound.length) {
                Conversation.find({_id: conversationId}).then(convoFound => {
                    if (convoFound.length) {
                        if (convoFound[0].isDirectMessage == false) {
                            if (idSent == new ObjectID(convoFound[0].ownerId)) {
                                if (convoFound[0].isEncrypted == true) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {isEncrypted: false}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("encryption-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Encryption Toggled Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned encryption off."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {isEncrypted: true}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("encryption-toggled-on", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Encryption Toggled On", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned encryption on."
                                            })
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
                                    message: "Only the owner can do this."
                                })
                            }
                        } else {
                            if (idSent == new ObjectID(convoFound[0].members[0])) {
                                if (convoFound[0].isEncrypted == true) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {isEncrypted: false}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("encryption-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Encryption Toggled Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned encryption off."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {isEncrypted: true}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("encryption-toggled-on", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Encryption Toggled On", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned encryption on."
                                            })
                                        })
                                    }).catch(err => {
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                }
                            } else if (idSent == new ObjectID(convoFound[0].members[1])) {
                                if (convoFound[0].isEncrypted == true) {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {isEncrypted: false}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("encryption-toggled-off", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Encryption Toggled Off", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned encryption off."
                                            })
                                        })
                                    }).catch(err => {
                                        console.log(err)
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                } else {
                                    Conversation.findOneAndUpdate({_id: conversationId}, {isEncrypted: true}).then(function() {
                                        const serverMessagesId = new ObjectID()
                                        generateTwoDigitDate(function(datetime) {
                                            io.sockets.in(conversationId).emit("encryption-toggled-on", userFound[0].secondId, serverMessagesId, datetime)
                                            serverMessage(conversationId, "Encryption Toggled On", {userThatToggled: userFound[0].secondId}, serverMessagesId, datetime)
                                            res.json({
                                                status: "SUCCESS",
                                                message: "Turned encryption on."
                                            })
                                        })
                                    }).catch(err => {
                                        res.json({
                                            status: "FAILED",
                                            message: "Error when updating."
                                        })
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Error finding you in the dm."
                                })
                            }
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Issue finding conversation."
                        })
                   }
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Couldn't find user."
                })
            }
        })
    }
})

//add to gc
app.post("/addMember", (req,res) => {
    //sent
    const sentId = req.body.sentId
    const conversationId = req.body.conversationId
    const pubIdOfUserToAdd = req.body.pubIdOfUserToAdd
    
    //main
    if (sentId == "" || conversationId == "" || pubIdOfUserToAdd == "") {
        res.json({
            status: "FAILED",
            message: "Error with params passed"
        })
    } else {    
        User.find({_id: sentId}).then(thisUsersData => {
            if (thisUsersData.length) {
                User.find({secondId: pubIdOfUserToAdd}).then(toAddUsersData => {
                    if (toAddUsersData.length) {
                        Conversation.find({_id: conversationId}).then(convoData => {
                            if (convoData.length) {
                                if (convoData[0].isDirectMessage == false) {
                                    if (convoData[0].members.length <= 13) {
                                        if (convoData[0].members.includes(toAddUsersData[0]._id)) {
                                            res.json({
                                                status: "FAILED",
                                                message: "User is in conversation."
                                            })  
                                        } else {
                                            Conversation.findOneAndUpdate({_id: conversationId}, { $push: { members: toAddUsersData[0]._id }}).then(function() { 
                                                console.log("Updated")
                                                const serverMessagesId = new ObjectID()
                                                generateTwoDigitDate(function(datetime) {
                                                    io.sockets.in(conversationId).emit("user-added", thisUsersData[0].secondId, toAddUsersData[0].secondId, serverMessagesId, datetime);
                                                    serverMessage(conversationId, "User Added", {userThatAdded: thisUsersData[0].secondId, userThatGotAdded: toAddUsersData[0].secondId}, serverMessagesId, datetime)
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Successfully added users.",
                                                        data: {name: toAddUsersData[0].name, displayName: toAddUsersData[0].displayName, pubId: toAddUsersData[0].secondId, imageKey: toAddUsersData[0].profileImageKey, isOwner: false}
                                                    })
                                                })
                                            }).catch(err => {
                                                console.log(err)
                                                res.json({
                                                    status: "FAILED",
                                                    message: "Error occured while updating members."
                                                })
                                            })
                                        }
                                    } else {
                                        res.json({
                                            status: "FAILED",
                                            message: "Max users."
                                        })
                                    }
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "You can't add members to a dm."
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Couldn't find the conversation?"
                                })
                            }
                        })
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find user to add."
                        })
                    }
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Error with user id passed."
                })
            }
        })
    }
})


app.post("/transferOwnerShip", (req, res) => {
    //passed values
    const idSent = req.body.idSent
    const convoId = req.body.convoId
    const idOfOther = req.body.idOfOther

    //main
    if (idSent == "" || convoId == "" || idOfOther == "") {
        res.json({
            status: "FAILED",
            message: "Issue with data sent"
        })
    } else {
        User.find({_id: idSent}).then(thisUsersData => {
            if (thisUsersData.length) {
                User.find({secondId: idOfOther}).then(userToBeOwner => {
                    if (userToBeOwner.length) {
                        Conversation.find({_id: convoId}).then(convoFound => {
                            if (convoFound.length) {
                                if (convoFound[0].isDirectMessage == false) {
                                    if (idSent == new ObjectID(convoFound[0].ownerId)) {
                                        Conversation.findOneAndUpdate({_id: convoId}, {ownerId: userToBeOwner[0]._id}).then(function() {
                                            const serverMessagesId = new ObjectID()
                                            generateTwoDigitDate(function(datetime) {
                                                io.sockets.in(convoId).emit("ownership-transferred", thisUsersData[0].secondId, userToBeOwner[0].secondId, serverMessagesId, datetime);
                                                serverMessage(convoId, "Ownership Transferred", {oldOwner: thisUsersData[0].secondId, newOwner: userToBeOwner[0].secondId}, serverMessagesId, datetime)
                                                res.json({
                                                    status: "SUCCESS",
                                                    message: "Owner Changed"
                                                })
                                            })
                                        }).catch(err => {
                                            console.log(err)
                                            res.json({
                                                status: "FAILED",
                                                message: "Error updating."
                                            })
                                        })
                                    } else {
                                        res.json({
                                            status: "FAILED",
                                            message: "Only the owner can do this."
                                        })
                                    }
                                } else {
                                    res.json({
                                        status: "FAILED",
                                        message: "DMs have a shared ownership."
                                    })
                                }
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Couldnt find conversation."
                                })
                            }   
                        }).catch(err => {
                            console.log(err)
                            res.json({
                                status: "FAILED",
                                message: "Error with finding conversation."
                            })
                        })
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Couldn't find other user."
                        })
                    }
                }).catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "Error Finding Other User."
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "Couldn't find your user."
                })
            }
        }).catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Error Finding User."
            })
        })
    }       
})

//Post Profile Image
app.post('/postGroupIcon', upload.single('image'), async (req, res) => {
    if (!req.file) {
        console.log("No file recieved.")
        return res.send({
            status: "FAILED",
            message: "No file sent."
        });
    } else {
        console.log('File has been recieved: ', req.file.filename)
        let {userId, conversationId} = req.body;
        const file = req.file;
        //check if user exists
        User.find({_id: userId}).then(userResult => {
            if (userResult.length) {
                Conversation.find({_id: conversationId}).then(convoFound => {
                    if (convoFound.length) {
                        if (convoFound[0].members.includes(userId)) {
                            if (convoFound[0].conversationImageKey !== '') {
                                //Remove old image key
                                let filepath = path.resolve(process.env.UPLOADED_PATH, convoFound[0].conversationImageKey);
                                fs.unlink(filepath, (err) => {
                                    if (err) {
                                        console.error('An error occured while deleting gorup chat image with key: ' + convoFound[0].conversationImageKey)
                                        console.error(err)
                                    }
                                })
                            }
                            Conversation.findOneAndUpdate({_id: conversationId}, { conversationImageKey: req.file.filename }).then(function(){
                                console.log("SUCCESS1")
                                const serverMessagesId = new ObjectID()
                                generateTwoDigitDate(function(datetime) {
                                    io.sockets.in(conversationId).emit("group-icon-changed", userResult[0].secondId, serverMessagesId, datetime);
                                    serverMessage(conversationId, "Group Icon Changed", {userThatChangedIcon: userResult[0].secondId}, serverMessagesId, datetime)
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Group Icon Updated",
                                    })
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
                                message: "User couldn't be found in conversation."
                            })
                        }
                    } else {
                        res.json({
                            status: "FAILED",
                            message: "Conversation couldn't be found?"
                        })
                    }
                }).catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "Error searching for conversation."
                    })
                })
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
                message: "Error searching for user"
            })
        });
    }
})

//get image key with user public ic
app.get('/getUsersDetailsWithPubIds/:pubId', (req, res) => { //Fix later (no limit to able to search for which may be an issue)
    const stringedPubIdsSent = req.params.pubId
    if (typeof stringedPubIdsSent === 'string' || stringedPubIdsSent instanceof String) {
        try {
            const pubIdsSent = stringedPubIdsSent.split(",")
            if (pubIdsSent.length !== 0) {
                var pubIdsSearched = 0
                var sendBack = []
                pubIdsSent.forEach(function (item, index) {
                    User.find({secondId: pubIdsSent[index]}).then(userFound => {
                        if (userFound.length) {
                            if (userFound[0].profileImageKey !== "") {
                                sendBack.push({
                                    name: userFound[0].name,
                                    displayName: userFound[0].displayName,
                                    imageKey: userFound[0].profileImageKey
                                })
                                pubIdsSearched++;
                                if (pubIdsSearched == pubIdsSent.length) {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Found all.",
                                        data: sendBack
                                    })
                                }
                            } else {
                                sendBack.push({
                                    name: userFound[0].name,
                                    displayName: userFound[0].displayName,
                                    imageKey: ""
                                })
                                pubIdsSearched++;
                                if (pubIdsSearched == pubIdsSent.length) {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Found all.",
                                        data: sendBack
                                    })
                                }
                            }
                        } else {
                            pubIdsSearched++;
                            if (pubIdsSearched == pubIdsSent.length) {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Found all.",
                                    data: sendBack
                                })
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                        res.json({
                            status: "FAILED",
                            message: "Error which was most likely one of the pubIds sent."
                        })
                    })
                })
            } else {
                res.json({
                    status: "FAILED",
                    message: "No pubIds sent."
                })
            }
        } catch (err) {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Issue probably with pubIds of sent"
            })
        }
    } else {
        res.json({
            status: "FAILED",
            message: "Issue with format of sent"
        })
    }
})

//get online users
app.get('/getOnlineUsersByDms/:idSent', (req, res) => { //Change to send back pubIds
    const idSent = req.params.idSent
    //
    const CreatedNewObjectIdForSetOffline = new ObjectID(idSent)
    console.log(CreatedNewObjectIdForSetOffline)
    Conversation.find({members: { $in: [CreatedNewObjectIdForSetOffline]}}).then(conversationsUserIsIn => {
        if (conversationsUserIsIn.length) {
            var itemsProcessed = 0
            var allOnline = []
            conversationsUserIsIn.forEach(function (item, index) {
                if (conversationsUserIsIn[index].isDirectMessage == true) {
                    var firstMember = conversationsUserIsIn[index].members[0]
                    var idOfOther
                    if (firstMember.equals(CreatedNewObjectIdForSetOffline)) {
                        idOfOther = conversationsUserIsIn[index].members[1]
                    } else {
                        idOfOther = conversationsUserIsIn[index].members[0]
                    }
                    User.find({_id: idOfOther}).then(otherUserFound => {
                        if (otherUserFound.length) {
                            getSocketToSendMessageTo(otherUserFound[0].secondId, function(socketsToSendTo) {
                                if (socketsToSendTo == null || socketsToSendTo.length == 0) {
                                    console.log("Socket returned was empty or something")
                                    itemsProcessed++;
                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Found Online Users.",
                                            data: allOnline
                                        })
                                    }
                                } else {
                                    var socketsProcessed = 0
                                    var validSockets = []
                                    socketsToSendTo.forEach(function (item, index) {
                                        validSockets.push(socketsToSendTo[index])
                                        socketsProcessed++;
                                        if (socketsProcessed == socketsToSendTo.length) {
                                            if (validSockets.length !== 0) {
                                                allOnline.push(otherUserFound[0].secondId)
                                                itemsProcessed++;
                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Found Online Users.",
                                                        data: allOnline
                                                    })
                                                }
                                            } else {
                                                itemsProcessed++;
                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Found Online Users.",
                                                        data: allOnline
                                                    })
                                                }
                                            }
                                        }
                                    })
                                }
                            })
                        } else {
                            itemsProcessed++;
                            if (itemsProcessed == conversationsUserIsIn.length) {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Found Online Users.",
                                    data: allOnline
                                })
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                        itemsProcessed++;
                        if (itemsProcessed == conversationsUserIsIn.length) {
                            res.json({
                                status: "SUCCESS",
                                message: "Found Online Users.",
                                data: allOnline
                            })
                        }
                    })
                } else {
                    itemsProcessed++;
                    if (itemsProcessed == conversationsUserIsIn.length) {
                        res.json({
                            status: "SUCCESS",
                            message: "Found Online Users.",
                            data: allOnline
                        })
                    }
                }
            })
        } else {
            console.log("No conversations to set online for.")
            res.json({
                status: "SUCCESS",
                message: "No conversations to set online for.",
                data: []
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error searching for online users"
        })
    })
})

//get online users
app.get('/getOnlineUsersInConversation/:idSent/:conversationId', (req, res) => {
    const idSent = req.params.idSent
    const conversationId = req.params.conversationId
    //
    Conversation.find({_id: conversationId}).then(conversationsUserIsIn => {
        if (conversationsUserIsIn.length) {
            const CreatedNewObjectIdForSetOffline = new ObjectID(idSent)
            console.log(CreatedNewObjectIdForSetOffline)
            if (conversationsUserIsIn[0].members.includes(CreatedNewObjectIdForSetOffline)) {
                var itemsProcessed = 0
                var allOnline = []
                if (conversationsUserIsIn[0].isDirectMessage == true) {
                    itemsProcessed++;
                    if (itemsProcessed == conversationsUserIsIn.length) {
                        res.json({
                            status: "SUCCESS",
                            message: "Found Online Users.",
                            data: allOnline
                        })
                    }
                } else {
                    if (conversationsUserIsIn[0].members == 1 || conversationsUserIsIn[0].members == 0) {
                        itemsProcessed++;
                        if (itemsProcessed == conversationsUserIsIn.length) {
                            res.json({
                                status: "SUCCESS",
                                message: "Found Online Users.",
                                data: allOnline
                            })
                        }
                    } else {
                        conversationsUserIsIn[0].members.forEach(function (item, index) {
                            getSocketToSendMessageTo(conversationsUserIsIn[index].members[index], function(socketsToSendTo) {
                                if (socketsToSendTo == null || socketsToSendTo.length == 0) {
                                    itemsProcessed++;
                                } else {
                                    var socketsChecked = 0
                                    socketsToSendTo.forEach(function (item, index) {
                                        try {
                                            if (io.sockets.sockets[socketsToSendTo[index]] !== undefined) {
                                                allOnline.push(idOfOther)
                                                socketsChecked++;
                                                if (socketsChecked == socketsToSendTo.length) {
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        res.json({
                                                            status: "SUCCESS",
                                                            message: "Found Online Users.",
                                                            data: allOnline
                                                        })
                                                    }
                                                }
                                            } else {
                                                socketsChecked++;
                                                if (socketsChecked == socketsToSendTo.length) {
                                                    itemsProcessed++;
                                                    if (itemsProcessed == conversationsUserIsIn.length) {
                                                        res.json({
                                                            status: "SUCCESS",
                                                            message: "Found Online Users.",
                                                            data: allOnline
                                                        })
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.log(e)
                                            socketsChecked++;
                                            if (socketsChecked == socketsToSendTo.length) {
                                                itemsProcessed++;
                                                if (itemsProcessed == conversationsUserIsIn.length) {
                                                    res.json({
                                                        status: "SUCCESS",
                                                        message: "Found Online Users.",
                                                        data: allOnline
                                                    })
                                                }
                                            }
                                        }
                                    })
                                }
                            })
                        })
                    }
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "User not in convo."
                })
            }
        } else {
            res.json({
                status: "FAILED",
                message: "Issue finding conversation."
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error finding conversation."
        })
    })
})

app.get("/getImageOnServer/:imageKey", (req, res) => {
    var imageKey = req.params.imageKey
    try {
        var filepath = path.resolve(process.env.UPLOADED_PATH, imageKey)
        //filepath = filepath.replace(/\.[^/.]+$/, ".webp")
        
        const readableStream = fs.createReadStream(filepath, {encoding: 'base64'})
        const passThroughStream = new stream.PassThrough() // For stream error handling
        stream.pipeline(
            readableStream,
            passThroughStream, //For error handling
            (err) => {
                if (err) {
                    console.log(err) // Either no file or error
                    return res.json({
                        status: "FAILED",
                        message: "Error finding image."
                    }) 
                }
            }
        )
        passThroughStream.pipe(res)
    } catch (err) {
        console.log("Error getting image from on server.")
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error getting image from server."
        })
    }
  });
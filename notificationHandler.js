const { Expo } = require('expo-server-sdk')
let expo = new Expo();

const User = require('./models/User');

async function createMessages(userId, message, data, callback) {
    console.log("hi1")
    await User.find({_id: userId}).then(userFound =>{
        if (userFound.length) {
            console.log("hi2")
            let messages = [];
            let notifKeys = userFound[0].notificationKeys
            for (var i = 0; i < notifKeys.length; i++) {
                console.log("hi3")
                if (Expo.isExpoPushToken(notifKeys[i])) {
                    messages.push({
                        to: notifKeys[i],
                        sound: 'default',
                        title: message.title, // e.g "Post Upvoted"
                        body: message.body, // e.g "thekookiekov upvoted your post"
                        data: data // id of other and of post e.g "thekookiekovs id" "image posts id" "post type"
                    })
                } else {
                    console.log("Not valid token found: " + notifKeys)
                }
            }
            console.log("hi4")
            console.log(messages)
            if (messages.length > 0) {
                console.log("messages returning")
                return callback(messages);
            } else {
                console.log("No valid notif keys")
                return callback("Failed");
            }
        } else {
            console.log("Notification key user finding couldn't be found: " + userId)
            return callback("Failed");
        }
    }).catch(err => {
        console.log(err)
        return callback("Failed");
    }) 
}

function sendNotifications(userId, message, data) {
    createMessages(userId, message, data, async function(messages) {
        console.log("hi5")
        console.log(messages)
        if (messages !== "Failed") {
            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log(ticketChunk) 
                } catch (error) {
                    console.error(error);
                }
            }
        } else {
            console.log("Notification Failure")
        }
    })
}

exports.sendNotifications = sendNotifications;

require('dotenv').config();
const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')
const { v4: uuidv4 } = require('uuid');

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new S3 ({
    region,
    accessKeyId,
    secretAccessKey
})

class SocketClients {
    constructor() {
        this.clientList = [];
        this.saveClient = this.saveClient.bind(this);
        this.removeClient = this.removeClient.bind(this);
        this.removeClientsOfUserFromConversation = this.removeClientsOfUserFromConversation.bind(this);
    }
    saveClient(pubId, conversationId, client, deviceUUID) { 
        var newUUID = uuidv4(); 
        this.clientList = [
            ...this.clientList, 
            {
                pubId: pubId,
                conversationId: conversationId,
                connectionUUID: newUUID,
                socketId: client,
                deviceUUID: deviceUUID
            }
        ];
        return client // client is socket id
    }
    removeClient(deviceUUID) {
        const index = this.clientList.findIndex(x => x.deviceUUID === deviceUUID);
        if(index !== -1){
            this.clientList = [...this.clientList.slice(0, index), ...this.clientList.slice(index+1)];
            console.log("Removed a socket from clients")
            return deviceUUID
        }
    }
    removeClientsOfUserFromConversation(pubId, conversationId) {
        const thisIndex = this.clientList.findIndex(x => x.pubId == pubId && x.conversationId == conversationId)
        if (thisIndex !== -1) {
            this.clientList[thisIndex].conversationId = ""
            return this.clientList[thisIndex]
        } else {
            return null
        }
    }
}

const clients = new SocketClients()

function addSocketToClients(pubId, conversationId, socket, uuidOfDevice, callback) {
    clients.saveClient(pubId, conversationId, socket, uuidOfDevice)
    console.log("Added socket to clients")
    console.log(clients.clientList)
    return callback(socket)
}
exports.addSocketToClients = addSocketToClients

function clientConnectedToConversation(conversationId, deviceUUID, callback) {
    const index = clients.clientList.findIndex(x => x.deviceUUID == deviceUUID)
    if (index !== -1) {
        clients.clientList[index].conversationId = conversationId
        return callback(`socketHandler: Joined ${conversationId}`)
    }
    return callback(null)
}
exports.clientConnectedToConversation = clientConnectedToConversation

function clientDisconnectedToConversation(deviceUUID, callback) {
    const index = clients.clientList.findIndex(x => x.deviceUUID == deviceUUID)
    if (index !== -1) {
        clients.clientList[index].conversationId = ""
        return callback(`socketHandler: Left ${conversationId}`)
    }
    return callback(null)
}
exports.clientDisconnectedToConversation = clientDisconnectedToConversation

function getSocketToSendMessageTo(pubId, callback) {
    var arrayOfSockets = []
    //console.log(clients.clientList)
    //this shit is happening 100's of times
    const lengthOfMatches = clients.clientList.filter(x => x.pubId==pubId).length;
    for (var i = 0; i <= lengthOfMatches; i++) {
        const socketIndexFound = clients.clientList.findIndex(x => x.pubId == pubId && arrayOfSockets.includes(x.socketId) == false) 
        console.log(`SocketFound to send message to index: ${socketIndexFound}`)
        if (socketIndexFound !== -1) {
            arrayOfSockets.push(clients.clientList[socketIndexFound].socketId)
            if (i == lengthOfMatches) {
                return callback(arrayOfSockets);
            }
        } else {
            if (arrayOfSockets.length !== 0) {
                return callback(arrayOfSockets);
            } else {
                return callback(null);
            }
        }
    }
};
exports.getSocketToSendMessageTo = getSocketToSendMessageTo

function getSocketToDisconnect(conversationId, pubId, callback) {
    var arrayOfSockets = []
    //console.log(clients.clientList)
    const lengthOfMatches = clients.clientList.filter(x => x.pubId==pubId).length;
    for (var i = 0; i <= lengthOfMatches; i++) {
        const socketIndexFound = clients.clientList.findIndex(x => x.pubId == pubId && x.conversationId == conversationId && arrayOfSockets.includes(x.socketId) == false) 
        console.log(`SocketFound to sent disconnect to index: ${socketIndexFound}`)
        if (socketIndexFound !== -1) {
            arrayOfSockets.push(clients.clientList[socketIndexFound].socketId)
        } else {
            if (arrayOfSockets.length !== 0) {
                return callback(arrayOfSockets);
            } else {
                return callback(null);
            }
        }
    }
};
exports.getSocketToDisconnect = getSocketToDisconnect

function removeSocketDueToDisconnect(deviceUUID, callback) {
    const clientDisconnected = clients.removeClient(deviceUUID)
    if (clientDisconnected == deviceUUID) {
        console.log("removed one socket, socket list now:")
        console.log(clients.clientList)
        const toReturn = {
            status: "SUCCESS",
            message: "Removed from clients array."
        }
        return callback(toReturn);
    } else {
        const toReturn = {
            status: "FAILED",
            message: "Error removing from clients array."
        }
        return callback(toReturn);
    }
}
exports.removeSocketDueToDisconnect = removeSocketDueToDisconnect

function removeSocketFromClients(conversationId, pubId, callback) {
    const socketFound = clients.removeClientsOfUserFromConversation(pubId, conversationId)
    
    if (socketFound !== null) {
        return callback(socketFound);
    } else {
        return callback(null);
    }
};
exports.removeSocketFromClients = removeSocketFromClients

function checkIfDeviceUUIDConnected(uuidToTest, callback) {
    const deviceUUIDExists = clients.clientList.findIndex(x => x.deviceUUID == uuidToTest)
    if (deviceUUIDExists == -1) {
        return callback("Not Found")
    } else {
        var socketIdOfOld = clients.clientList[deviceUUIDExists].socketId
        console.log(`before socketIdOfOld ${socketIdOfOld}`)
        clients.clientList = [...clients.clientList.slice(0, deviceUUIDExists), ...clients.clientList.slice(deviceUUIDExists+1)];
        console.log(`after socketIdOfOld ${socketIdOfOld}`)
        return callback(socketIdOfOld)
    }
}
exports.checkIfDeviceUUIDConnected = checkIfDeviceUUIDConnected
require('dotenv').config()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const refreshTokenEncryptionKey = process.env.REFRESH_TOKEN_ENCRYPTION_KEY
const IV_LENGTH = 16; // 16 for AES (this is the cryptographic nonce pretty much)

function generateAuthJWT(toSign) { //to sign should be something like a user name or user id
    return jwt.sign({_id: toSign}, process.env.SECRET_FOR_TOKENS, {expiresIn: "30s"}) //900s is 15 minutes
}

// mongodb user model
const User = require('./../models/User');

function refreshTokenEncryption(refreshToken) {
    let iv = crypto.randomBytes(IV_LENGTH);// make nonce
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(refreshTokenEncryptionKey), iv); // create a unique cipher with the iv/nonce
    let encrypted = cipher.update(refreshToken); // encrypt token with said cypher
   
    encrypted = Buffer.concat([encrypted, cipher.final()]);
   
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

exports.refreshTokenEncryption = refreshTokenEncryption;

function refreshTokenDecryption(refreshToken) {
    let splitUpEncryptedString = refreshToken.split(':'); // because the nonce/iv is in front
    let iv = Buffer.from(splitUpEncryptedString.shift(), 'hex');
    let encryptedText = Buffer.from(splitUpEncryptedString.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(refreshTokenEncryptionKey), iv);
    let decrypted = decipher.update(encryptedText);
       
    decrypted = Buffer.concat([decrypted, decipher.final()]);
       
    return decrypted.toString(); 
}

exports.refreshTokenDecryption = refreshTokenDecryption;

function generateNewAuthToken(res, refreshToken) {
    jwt.verify(refreshToken, process.env.SECRET_FOR_TOKENS, (err, decoded) => {
        if (err) {
            console.log("Refresh Failed")
            console.log("Issue with refresh token may be incorrect or expired.")
            res.sendStatus(403);
        } else {
            console.log(decoded)
            User.find({_id: decoded._id}).then(userFoundWithTokensId => {
                if (userFoundWithTokensId.length) {
                    const validTokenFound = () => {
                        console.log("Refresh token matches generating new auth token.")
                        const token = generateAuthJWT(userFoundWithTokensId[0]._id);
                        res.json({
                            status: "SUCCESS",
                            message: "New token generated.",
                            token: `Bearer ${token}`
                        })
                    }
                    //check if token is a valid refresh token
                    for (let i = 0; i < userFoundWithTokensId[0].refreshTokens.length; i++) {
                        let decryptedToken = refreshTokenDecryption(userFoundWithTokensId[0].refreshTokens[i])
                        if (decryptedToken == refreshToken) {
                            return validTokenFound()
                        } else {
                            if (i == userFoundWithTokensId[0].refreshTokens.length) {
                                // only would happen if all done and none matched
                                console.log("Refresh Failed")
                                console.log("Refresh token didn't match valid ones.")
                                res.sendStatus(403);
                            }
                        }
                    }
                } else {
                    console.log("Refresh Failed")
                    console.log("Refresh token didn't match valid ones.")
                    res.sendStatus(403);
                }
            }).catch(err => {
                console.log(`Error occured when finding user with the token: ${err}`)
                console.log("Refresh Failed")
                console.log("Refresh token didn't match valid ones.")
                res.sendStatus(403);
            })
        }
    })
}

function tokenValidation(req, res, next) {
    console.log("req.headers")
    console.log(JSON.stringify(req.headers))
    const authHeader = req.headers["auth-web-token"];
    const refreshHeader = req.headers["auth-refresh-token"];
    const token = authHeader && authHeader.split(" ")[1];
    const refreshToken = refreshHeader && refreshHeader.split(" ")[1];
    console.log(token)

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_FOR_TOKENS, (err, decoded) => {
        if (err) {
            //Invalid jwt attempt refresh
            generateNewAuthToken(res, refreshToken)
        } else {
            req.tokenData = decoded;
            next();
        }
    })
    //next();
}

exports.tokenValidation = tokenValidation;
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

// Password handler
const bcrypt = require('bcrypt');

// Memory cache for account verification codes
const NodeCache = require( "node-cache" );
const AccountVerificationCodeCache = new NodeCache({stdTTL: 300, checkperiod: 330});

// Use axios to make HTTP GET requests to random.org to get random base-16 strings for account verification codes
const axios = require('axios')

// Use .env file for email configuration
require('dotenv').config();

// Use nodemailer for sending emails to users
const nodemailer = require("nodemailer");
let mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT,
    secure: false, // IN THE FUTURE MAKE THIS TRUE --- true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
});

//Web Token Stuff

const { tokenValidation } = require("../middleware/TokenValidation");

//router.all("*", [tokenValidation]); // the * just makes it that it affects them all it could be /whatever and it would affect that only

function generateAuthJWT(toSign) { //to sign should be something like a user name or user id
    return jwt.sign({toSign}, process.env.SECRET_FOR_TOKENS, {expiresIn: "900s"}) //900s is 15 minutes
}

//Signup
router.post('/signup', (req, res) => {
    let {name, displayName, email, badges, password} = req.body;
    name = name.trim();
    displayName = ("")
    email = email.trim();
    badges = []
    password = password.trim();

    if (name == "" || email == "" || password == "") {
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else if (!/^[a-zA-Z0-9]*$/.test(name)) {
        res.json({
            status: "FAILED",
            message: "Invalid name entered"
        })
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        res.json({
            status: "FAILED",
            message: "Invalid email entered"
        })
    } else if (password.length < 8) {
        res.json({
            status: "FAILED",
            message: "Password is too short!"
        })
    } else if (name.length > 20) {
        res.json({
            status: "FAILED",
            message: "Username is too long! Please keep your username under 20 characters."
        })
    } else if (displayName.length > 20) {
        res.json({
            status: "FAILED",
            message: "Display name is too long! Please keep your display name under 20 characters."
        })
    } else {
        // Checking if user already exists
        User.find({email}).then(result => {
            if (result.length) {
                // A user already exists
                res.json({
                    status: "FAILED",
                    message: "User with the provided email already exists"
                })
            } else { 
                User.find({name}).then(result => {
                    // A username exists
                    if (result.length) {
                        res.json({
                            status: "FAILED",
                            message: "User with the provided username already exists"
                        })  
                    } else {
                        //Try to create a new user
                        const twoDigitDate = generateTwoDigitDate()
                        badges.push({badgeName: "onSignUpBadge", dateRecieved: twoDigitDate});
                        console.log(badges);
                        // password handling
                        const saltRounds = 10;
                        bcrypt.hash(password, saltRounds).then(hashedPassword => {
                            var newUUID = uuidv4(); 
                            const newUser = new User({
                                secondId: newUUID,
                                name,
                                displayName,
                                email,
                                badges,
                                password: hashedPassword,
                                followers: [],
                                following: [],
                                totalLikes: 0,
                                profileImageKey: ""
                            });

                            newUser.save().then(result => {
                                const token = generateAuthJWT(result._id);
                                res.json({
                                    status: "SUCCESS",
                                    message: "Signup successful",
                                    data: result,
                                    token: `Bearer ${token}`
                                })
                            })
                            .catch(err => {
                                console.log(err)
                                res.json({
                                    status: "FAILED",
                                    message: "An error occurred while saving user account!"
                                })
                            })
                        })
                    }
                })
                .catch(err => {
                    console.log(err)
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while hashing password!"
                    })
                })
            }
        }).catch(err => {
            console.log(err);
            res.json({
                status: "FAILED",
                message: "An error occurred while checking for existing user!"
            })
        })
    }

})

//Signin
router.post('/signin', (req, res) => {
    let {email, password} = req.body;
    email = email.trim();
    password = password.trim();

    if (email == "" || password == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        });
    } else {
        // Check if user exist
        User.find({ email })
        .then((data) => {
            if (data.length) {
                //User Exists
                const hashedPassword = data[0].password;
                bcrypt.compare(password, hashedPassword).then((result) => {
                    if (result) {
                        // Password match
                        const token = generateAuthJWT(data._id);
                        res.json({
                            status: "SUCCESS",
                            message: "Signin successful",
                            data: data,
                            token: `Bearer ${token}`
                        })
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
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid credentials entered!"
                })
            }
        })
        .catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: " An error occured while checking for existing user"
            })
        })
    }
})

router.post('/jwtRefresh', (req, res) => { //Might not be an ideal method so look into it
    const refreshToken = req.header("auth-refresh-token");
    
    jwt.verify(refreshToken, process.env.SECRET_FOR_TOKENS, (err, decoded) => {
        if (err) {
            res.json({
                status: "FAILED",
                message: "Issue with refresh token may be incorrect or expired."
            })
        } else {
            console.log(decoded)
            User.find({_id: decoded.toSend}).then(userFoundWithTokensId => {
                if (userFoundWithTokensId.length) {
                    //do some type of checking
                    const token = generateAuthJWT(userFoundWithTokensId._id);
                    res.json({
                        status: "SUCCESS",
                        message: "New token generated",
                        token: `Bearer ${token}`
                    })
                } else {
                    res.json({
                        status: "FAILED",
                        message: "Couldn't find the user with the token provided."
                    })
                }
            }).catch(err => {
                console.log(`Error occured when finding user with the token: ${err}`)
                res.json({
                    status: "FAILED",
                    message: "An error occured while finding out who you are with the token supplied."
                })
            })
        }
    })
})

module.exports = router;
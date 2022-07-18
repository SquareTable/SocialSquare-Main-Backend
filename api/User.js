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


// Memory cache for account verification codes
const NodeCache = require( "node-cache" );
const AccountVerificationCodeCache = new NodeCache({stdTTL: 300, checkperiod: 330});
const EmailVerificationCodeCache = new NodeCache({stdTTL: 300, checkperiod: 330});

// Use axios to make HTTP GET requests to random.org to get random base-16 strings for account verification codes
const axios = require('axios')

// Use .env file for email configuration
require('dotenv').config();

//Web Token Stuff

const { tokenValidation, refreshTokenEncryption, refreshTokenDecryption } = require("../middleware/TokenHandler");

//router.all("*", [tokenValidation]); // the * just makes it that it affects them all it could be /whatever and it would affect that only

function generateAuthJWT(toSign) { //to sign should be something like a user name or user id
    return jwt.sign({_id: toSign}, process.env.SECRET_FOR_TOKENS, {expiresIn: "30s"}) //900s is 15 minutes
}

function generateRefreshToken(toSign) {
    return jwt.sign({_id: toSign}, process.env.SECRET_FOR_TOKENS, {expiresIn: "900s"}) //900s is 15 minutes
}

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


function blurEmailFunction(emailToBlur) {
    // Modified stack overflow answer from https://stackoverflow.com/users/14547938/daniel
    // Answer link: https://stackoverflow.com/questions/64605601/partially-mask-email-address-javascript
    // --- Start of blur email code ---
    let parts = emailToBlur.split("@");
    let firstPart = parts[0];
    let secondPart = parts[1];
    let blur = firstPart.split("");
    let skip = 2;
    for (let i = 0; i < blur.length; i += 1) {
        if (skip > 0) {
            skip--;
            continue;
        }
        if (skip === 0) {
            blur[i] = "*";
            blur[i + 1] = "*";
            skip = 2;
            i++;
        }
    }
    let partsOfSecondPart = secondPart.split(".");
    let firstPartOfSecondPart = partsOfSecondPart[0];
    let secondPartOfSecondPart = partsOfSecondPart[1];
    let blurredSecondPart = firstPartOfSecondPart.split("");
    for (let i = 0; i < blurredSecondPart.length; i += 1) {
        if (skip > 0) {
            skip--;
            continue;
        }
        if (skip === 0) {
            blurredSecondPart[i] = "*";
            blurredSecondPart[i + 1] = "*";
            skip = 2;
            i++;
        }
    }
    let blurredMail = `${blur.join("")}@${blurredSecondPart.join("")}.${secondPartOfSecondPart}`;
    return blurredMail;
};

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
                                const refreshToken = generateRefreshToken(result._id);
                                const encryptedRefreshToken = refreshTokenEncryption(refreshToken)
                                User.findOneAndUpdate({_id: result._id}, {$push: {refreshTokens: encryptedRefreshToken}}).then(() => {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "SignUp successful",
                                        data: data,
                                        token: `Bearer ${token}`,
                                        refreshToken: `Bearer ${refreshToken}`
                                    })
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
                bcrypt.compare(password, hashedPassword).then(async (result) => {
                        if (result) {
                            // Password match
                            if (data[0].authenticationFactorsEnabled.includes('Email')) {
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
                                const success = EmailVerificationCodeCache.set(data[0].secondId, hashedRandomString);
                                if (!success) {
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occured while setting random string."
                                    })
                                    return
                                }

                                var emailData = {
                                    from: process.env.SMTP_EMAIL,
                                    to: data[0].MFAEmail,
                                    subject: "Code to login to your SocialSquare account",
                                    text: `Someone is trying to login to your account. If this is you, please enter this code into SocialSquare to login: ${randomString}. If you are not trying to login to your account, change your password immediately as someone else knows it.`,
                                    html: `<p>Someone is trying to login to your account. If this is you, please enter this code into SocialSquare to login: ${randomString}. If you are not trying to login to your account, change your password immediately as someone else knows it.</p>`
                                };

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
                                            message: "Email",
                                            data: {email: blurEmailFunction(data[0].MFAEmail), fromAddress: process.env.SMTP_EMAIL, secondId: data[0].secondId},
                                            token: `Bearer ${token}`,
                                            refreshToken: `Bearer ${refreshToken}`
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
                            } else {
                                const token = generateAuthJWT(data[0]._id);
                                const refreshToken = generateRefreshToken(data[0]._id);
                                const encryptedRefreshToken = refreshTokenEncryption(refreshToken)
                                User.findOneAndUpdate({_id: data[0]._id}, {$push: {refreshTokens: encryptedRefreshToken}}).then(() => {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Signin successful",
                                        data: data,
                                        token: `Bearer ${token}`,
                                        refreshToken: `Bearer ${refreshToken}`
                                    })
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Invalid password entered!"
                            })
                        }
                    })
                    .catch(err => {
                        console.log(err)
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

router.post('/checkusernameavailability', (req, res) => {
    let {username} = req.body;
    if (username == null) {
        res.json({
            status: "FAILED",
            message: "Username has not been provided"
        })
    } else if (username.length < 1) {
        res.json({
            status: "FAILED",
            message: "Username cannot be blank"
        })
    } else if (!username) {
        res.json({
            status: "FAILED",
            message: "Error getting username"
        })
    } else {
        User.find({name: username}).then(userFound => {
            if (userFound.length) {
                res.json({
                    status: "SUCCESS",
                    message: "Username is not available"
                })
            } else {
                res.json({
                    status: "SUCCESS",
                    message: "Username is available"
                })
            }
        }).catch(err => {
            console.log(err)
            res.json({
                status: "FAILED",
                message: "Error finding user."
            })
        })
    }
})

router.post('/forgottenpasswordaccountusername', (req, res) => {
    let {username} = req.body;
    username = username.toLowerCase().trim();
    User.find({name: username}).then(userFound => {
        if (userFound.length) {
            // User exists
            // Create a verification key so the user can reset their password
            axios.get('https://www.random.org/integers/?num=1&min=1&max=1000000000&col=1&base=16&format=plain&rnd=new').then((randomString) => {
                randomString = randomString.data.trim();
                if (randomString.length === 8) {
                    // String can be used for account verification
                    const userID = userFound[0]._id.toString();
                    const userEmail = userFound[0].email;
                    const saltRounds = 10;
                    bcrypt.hash(randomString, saltRounds).then(hashedRandomString => {
                        const success = AccountVerificationCodeCache.set(userID, hashedRandomString);
                        if (success) {
                            let blurredMail = blurEmailFunction(userEmail)
                            // --- End of blur email code ---
                            var emailData = {
                                from: process.env.SMTP_EMAIL,
                                to: userEmail,
                                subject: "Reset password for your SocialSquare account",
                                text: `Your account requested a password reset. Please enter this code into SocialSquare to reset your password: ${randomString}. If you did not request a password reset, please ignore this email.`,
                                html: `<p>Your account requested a password reset. Please enter this code into SocialSquare to reset your password: ${randomString}. If you did not request a password reset, please ignore this email.</p>`
                            };
                            mailTransporter.sendMail(emailData, function(error, response){ // Modified answer from https://github.com/nodemailer/nodemailer/issues/169#issuecomment-20463956
                                if(error){
                                    console.log("Error happened while sending email to user for forgotten password. Username of user was: " + userFound[0].name);
                                    console.log("Error type:", error.name);
                                    console.log("SMTP log:", error.data);
                                    res.json({
                                        status: "FAILED",
                                        message: "Error sending email to reset password."
                                    })
                                } else if (response) {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Email sent to reset password.",
                                        data: {blurredEmail: blurredMail, fromAddress: process.env.SMTP_EMAIL}
                                    })
                                } else {
                                    console.log('Mail send error object: ' + error);
                                    console.log('Mail send response object: ' + response);
                                    res.json({
                                        status: "FAILED",
                                        message: "An unexpected error occured while sending email to reset password."
                                    })
                                }
                            });
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Error while setting verification code."
                            })
                        }
                    }).catch((error) => {
                        console.log('Error hashing random string: ' + error);
                        res.json({
                            status: "FAILED",
                            message: "Error hashing random string."
                        })
                    })
                } else {
                    // String can't be used for account verification
                    console.log('Error happened while generating random string. The random string generated was: ' + randomString);
                    res.json({
                        status: "FAILED",
                        message: "Error occured while generating random string."
                    })
                }
            }).catch((error) => {
                console.log(error)
                res.json({
                    status: "FAILED",
                    message: "Error generating random number."
                })
            })
        } else {
            res.json({
                status: "FAILED",
                message: "There is no user with this username. Please try again."
            })
        }
    }).catch(err => {
        console.log(err)
        res.json({
            status: "FAILED",
            message: "Error finding user. Please try again"
        })
    })
})

router.post('/checkverificationcode', (req, res) => {
    let {username, verificationCode, task, getAccountMethod, userID, email, secondId} = req.body;

    if (getAccountMethod == 'username') {
        username = username.toLowerCase().trim();
        User.find({name: username}).then(userFound => {
            if (userFound.length) {
                const userID = userFound[0]._id.toString();
                const hashedVerificationCode = AccountVerificationCodeCache.get(userID);
                if (hashedVerificationCode == undefined) {
                    res.json({
                        status: "FAILED",
                        message: "Verification code has expired. Please create a new code."
                    })
                } else {
                    bcrypt.compare(verificationCode, hashedVerificationCode).then(result => {
                        if (result) {
                            if (task == 'Check Before Reset Password') {
                                res.json({
                                    status: "SUCCESS",
                                    message: "Verification code is correct."
                                })
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Task is not supported."
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Verification code is incorrect."
                            })
                        }
                    }).catch(error => {
                        console.log(error)
                        res.json({
                            status: "FAILED",
                            message: "Error comparing verification code. Please try again."
                        })
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "There is no user with that username. Please try again."
                })
            }
        }).catch((error) => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "Error finding user. Please try again"
            })
        })
    } else if (getAccountMethod == 'userID') {
        userID = userID.toString().trim();

        User.find({_id: userID}).then(userFound => {
            if (userFound.length) {
                const hashedVerificationCode = EmailVerificationCodeCache.get(userID);
                if (hashedVerificationCode == undefined) {
                    res.json({
                        status: "FAILED",
                        message: "Verification code has expired. Please create a new code."
                    })
                } else {
                    bcrypt.compare(verificationCode, hashedVerificationCode).then(result => {
                        if (result) {
                            if (task == 'Add Email Multi-Factor Authentication') {
                                User.findOneAndUpdate({_id: userID}, {$push: {authenticationFactorsEnabled: 'Email'}}).then(function() {
                                    User.findOneAndUpdate({_id: userID}, {MFAEmail: email}).then(function() {
                                        res.json({
                                            status: "SUCCESS",
                                            message: "Email is now a multi-factor authentication factor for your account."
                                        })
                                    }).catch(error => {
                                        console.log(error)
                                        console.log('An error occured while setting MFAEmail to an email for user with ID: ' + userID)
                                        res.json({
                                            status: "FAILED",
                                            message: "An error occured while setting your email for multi-factor authentication."
                                        })
                                    })
                                }).catch(error => {
                                    console.log(error)
                                    console.log('An error occured while adding Email to the list of authentication factors enabled for user with ID: ' + userID)
                                    res.json({
                                        status: "FAILED",
                                        message: "An error occured while adding email to the list of authentication factors enabled for your account. Please try again later."
                                    })
                                })
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Task is not supported."
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Verification code is incorrect."
                            })
                        }
                    }).catch(error => {
                        console.log(error)
                        res.json({
                            status: "FAILED",
                            message: "Error comparing verification code. Please try again."
                        })
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "User not found."
                })
            }
        }).catch(error => {
            console.log(error);
            console.log('An error occured while finding user with ID: ' + userID)
            res.json({
                status: "FAILED",
                message: "An error occured while finding the user."
            })
        })
    } else if (getAccountMethod == 'secondId') {
        User.find({secondId: secondId}).then(userFound => {
            if (userFound.length) {
                const hashedVerificationCode = EmailVerificationCodeCache.get(secondId);
                if (hashedVerificationCode == undefined) {
                    res.json({
                        status: "FAILED",
                        message: "Verification code has expired. Please create a new code."
                    })
                } else {
                    bcrypt.compare(verificationCode, hashedVerificationCode).then(result => {
                        if (result) {
                            if (task == "Verify Email MFA Code") {
                                const token = generateAuthJWT(data[0]._id);
                                const refreshToken = generateRefreshToken(data[0]._id);
                                const encryptedRefreshToken = refreshTokenEncryption(refreshToken)
                                User.findOneAndUpdate({_id: data[0]._id}, {$push: {refreshTokens: encryptedRefreshToken}}).then(() => {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Signin successful",
                                        data: data,
                                        token: `Bearer ${token}`,
                                        refreshToken: `Bearer ${refreshToken}`
                                    })
                                })
                            } else {
                                res.json({
                                    status: "FAILED",
                                    message: "Unsupported task sent."
                                })
                            }
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Verification code is incorrect."
                            })
                        }
                    }).catch(error => {
                        console.log(error)
                        console.log('An error occured while unhashing verification code.')
                        res.json({
                            status: "FAILED",
                            message: "An error occured while unhashing verification code. Please try again later."
                        })
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "User not found."
                })
            }
       }).catch(error => {
           console.log(error)
           console.log('An error occured while finding user with secondId: ' + secondId)
           res.json({
               status: "FAILED",
               message: "An error occured while finding the user. Please try again later."
           })
       })
    } else {
        res.json({
            status: "FAILED",
            message: "getAccountMethod not supported."
        })
    }
})

//ChangePassword
router.post('/changepasswordwithverificationcode', (req, res) => {
    let {newPassword, confirmNewPassword, verificationCode, username} = req.body;
    newPassword = newPassword.trim()
    confirmNewPassword = confirmNewPassword.trim()

    if (newPassword == "" || confirmNewPassword == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        })
    } else if (newPassword !== confirmNewPassword) {
        res.json({
            status: "FAILED",
            message: "Passwords do not match!"
        })
    } else if (newPassword.length < 8) {
        res.json({
            status: "FAILED",
            message: "Password must be at least 8 characters long!"
        })
    } else {
        User.find({name: username}).then(userFound => {
            if (userFound.length) {
                //User exists
                const userID = userFound[0]._id.toString();
                const hashedVerificationCode = AccountVerificationCodeCache.get(userID);
                if (hashedVerificationCode == undefined) {
                    res.json({
                        status: "FAILED",
                        message: "Verification code has expired. Please create a new code."
                    })
                } else {
                    bcrypt.compare(verificationCode, hashedVerificationCode).then(result => {
                        if (result) {
                            //Verification code is correct
                            AccountVerificationCodeCache.del(userID);
                            const saltRounds = 10;
                            bcrypt.hash(newPassword, saltRounds).then(hashedPassword => {
                                User.findOneAndUpdate({_id: userID}, {password: hashedPassword}).then(result => {
                                    res.json({
                                        status: "SUCCESS",
                                        message: "Password changed successfully."
                                    })
                                }).catch(error => {
                                    console.log(error)
                                    res.json({
                                        status: "FAILED",
                                        message: "Error changing password. Please try again."
                                    })
                                })
                            }).catch(error => {
                                console.log(error)
                                res.json({
                                    status: "FAILED",
                                    message: "Error hashing password. Please try again."
                                })
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Verification code is incorrect."
                            })
                        }
                    }).catch(error => {
                        console.log(error)
                        res.json({
                            status: "FAILED",
                            message: "Error comparing verification code. Please try again."
                        })
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "There is no user with that username. Please try again."
                })
            }
        }).catch((error) => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "Error finding user. Please try again"
            })
        })
    }
})


module.exports = router;
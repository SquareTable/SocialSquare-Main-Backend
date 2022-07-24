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

module.exports = {
    blurEmailFunction,
    mailTransporter
};
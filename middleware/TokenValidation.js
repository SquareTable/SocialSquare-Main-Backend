const jwt = require('jsonwebtoken')

function tokenValidation(req, res, next) {
    /*
    const authHeader = req.headers["refresh-token"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_FOR_TOKENS, (err, decoded) => {
        if (err) {
            return res.sendStatus(403);
        } else {
            req.tokenData = decoded;
            next();
        }
    })
    */
    next();
}

exports.tokenValidation = tokenValidation
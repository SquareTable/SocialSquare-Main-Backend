// Memory cache for account verification codes
const NodeCache = require( "node-cache" );
const AccountVerificationCodeCache = new NodeCache({stdTTL: 300, checkperiod: 330});
const EmailVerificationCodeCache = new NodeCache({stdTTL: 300, checkperiod: 330});

function setCacheItem(cache, key, value) {
    if (cache == 'EmailVerificationCodeCache') {
        return EmailVerificationCodeCache.set(key, value);
    } else if (cache == 'AccountVerificationCodeCache') {
        return AccountVerificationCodeCache.set(key, value);
    } else {
        throw Error('Wrong cache name provided to memoryCache.js setCacheItem function');
    }
}

function getCacheItem(cache, key) {
    if (cache == 'EmailVerificationCodeCache') {
        return EmailVerificationCodeCache.get(key);
    } else if (cache == 'AccountVerificationCodeCache') {
        return AccountVerificationCodeCache.get(key);
    } else {
        throw Error('Wrong cache name provided to memoryCache.js getCacheItem function');
    }
}

function delCacheItem(cache, key) {
    if (cache == 'EmailVerificationCodeCache') {
        return EmailVerificationCodeCache.del(key);
    } else if (cache == 'AccountVerificationCodeCache') {
        return AccountVerificationCodeCache.del(key);
    } else {
        throw Error('Wrong cache name provided to memoryCache.js delCacheItem function');
    }
}
module.exports = {
    setCacheItem,
    getCacheItem,
    delCacheItem
}
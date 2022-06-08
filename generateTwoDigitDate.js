function generateTwoDigitDate() {
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
    return datetime
}

exports.generateTwoDigitDate = generateTwoDigitDate
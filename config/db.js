require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    })
    .then(() => {
      console.log("DB Connected");  
      //test
      console.log(process.env.AWS_BUCKET_NAME)
    })
    .catch((err) => console.log(err));
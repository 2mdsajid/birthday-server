// const { ViewModuleSharp } = require("@material-ui/icons");
const mongoose = require("mongoose")

// DeprecationWarning:
mongoose.set('strictQuery', true)

const pass = process.env.MONGOPASS

const DB = `mongodb+srv://2mdsajid:${pass}@cluster0.6ngpgkm.mongodb.net/bdays?retryWrites=true&w=majority`


mongoose.connect(DB).then(()=>{
    console.log('connected successfully to bdays database');
}).catch((err)=>{console.log('error while connecting to database')})

module.exports = mongoose.connection;


// mongoimport --uri mongodb+srv://2mdsajid:UDkWosAVB0rbfpzh@cluster0.qzob3kp.mongodb.net/med-loc-1 --collection chemistries --type json --file "C:\Users\sajid aalam\Downloads\chem.json" --jsonArray

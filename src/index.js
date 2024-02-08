import mongoose from "mongoose";
import {DB_NAME} from "./constants";


//FIRST APPROACH
import express  from "express";
const app = express();

( async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
       app.on("errror",(error)=>{
        console.log("Error: Our app is not able to talk to database", error);
        throw error
       })

app.listen(process.env.PORT, ()=>{
    console.log(`App is listening on port ${process.env.PORT}`)
})

    } catch (error) {
        console.error("ERROR:", error);
        throw error
    }
})()
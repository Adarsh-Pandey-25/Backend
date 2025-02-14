// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import {app} from "./app.js"
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})

connectDB()

.then(() => {
    app.listen(process.env.PORT || 4000,()=>{
        console.log("Listening on PORT ", process.env.PORT);
        
    })
    
})
.catch((err) =>{
    console.log("Connection to MONGODB failed!!!", err);
    
})

app.on("error",(error)=>{
    console.log("ERROR: ", error);
    throw error;
    
})



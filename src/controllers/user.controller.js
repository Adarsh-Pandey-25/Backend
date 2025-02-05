import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import {uploadOnCLoudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";


const registerUser=asyncHandler(async(req,res)=>{
    // res.status(400).json({
    //     message: "ok"
    // });

    const {userName, fullName, password, email}= req.body;
    console.log("email", email);
    console.log("username", userName);
    console.log("FullName", fullName);
    console.log("password",password);
    
    if([fullName, password, userName, email].some((field)=>field?.trim()=="")){
        throw new apiError(400, "All fields are required!!!")
    }
    

    const existedUser= User.findOne({
        $or:[{userName},{email}]
    })

    if(existedUser){
        throw new apiError(409, "User Already Exists!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required!!")
    }

    
    const avatar =await uploadOnCLoudinary(avatarLocalPath);
    const coverImage= await uploadOnCLoudinary(coverImageLocalPath);

    if(!avatar){
        throw new apiError (400, "Avatar is required")
    }

    const User= await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url|| "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser= await User.findById(User._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500, "Something went wrong while registering User!");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User Registered Successfully!")
    )

});

export {registerUser};
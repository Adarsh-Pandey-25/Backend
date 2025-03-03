import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import {uploadOnCLoudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.accessToken=accessToken
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return {accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser=asyncHandler(async(req,res)=>{
    const {userName, fullName, password, email}=req.body;
    // console.log("email", email);
    // console.log("username", userName);
    // console.log("FullName", fullName);
    // console.log("password",password);
    // console.log(req)
    if([fullName, password, userName, email].some((field)=>field?.trim()=="")){
        throw new apiError(400, "All fields are required!!!")
    }
    

    const existedUser= await User.findOne({
        $or:[{userName},{email}]
    })

    if(existedUser){
        throw new apiError(409, "User Already Exists!")
    }

    const avatarLocalPath = req.files?.avatar[0].path;
    // const coverImageLocalPath = req.files?.coverImage[0].path;

    // let avatarLocalPath;
    // if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length>0){
    //     avatarLocalPath=req.files.avatar[0].path;
    // }
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required!!")
    }

    
    const avatar =await uploadOnCLoudinary(avatarLocalPath);
    const coverImage= await uploadOnCLoudinary(coverImageLocalPath);

    if(!avatar){
        throw new apiError (400, "Avatar is required")
    }

    const user= await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url|| "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500, "Something went wrong while registering User!");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User Registered Successfully!")
    )

});

const loginUser=asyncHandler(async(req, res)=>{
    const {email, userName, password}=req.body;
    if(!userName && !email){
        throw new apiError (400, "Useraname & email is required")
    }

    const user=await User.findOne(
        {
            $or:[{userName}, {email}]
        }
    )

    if(!user){
        throw new apiError(404, "User does not exists!!")
    }
    

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new apiError(401, "Invalid user Credentials!")
    }

    const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")
    // const loggedInUser = await User.findById(user._id).select("userName email _id");

    const options={
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken",accessToken, options).cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(200,{
            user: loggedInUser, accessToken, refreshToken
        },
        "User LoggedIn Successfully"
    )
    )
})

const logOutUser= asyncHandler(async(req, res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options={
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).
    json(new apiResponse(200,{},"User Logged Out Successfully!"))
})


const refreshAccessToken= asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookie.refreshToken|| req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401,"Unauthorized request!!!")
    }

    try {
        const decodedToken= jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
        const user= await User.findById(decodedToken?._id)
    
        if(!user){
            throw new apiError(401,"Invalid refresh Token!!")
        }
    
        if(incomingRefreshToken !== user?.refreshToken ){
            throw new apiError(401, "Refresh Token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken, newrefreshToken}= await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken", accessToken,options).cookie("refreshToken", refreshToken,options)
        .json(
            new apiResponse(
                200,
                
                {accessToken, newrefreshToken},
                "Access Token Refresh Successfully"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message|| "Incvalid Refresh Token")
    }
    
})
export {};
export {loginUser,
    registerUser,
    logOutUser,
    refreshAccessToken 
    };
import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefereshTokens = async(userId)=>{

    try {
       const user = await User.findById(userId)
    console.log(user)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
        
       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave: false})
      
       return{accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    
    //get user details from postman/frontend
    // validation (not empty)
    //check if user already exists: username and email
    // check for images, check for avatar
    //upload them on cloudinary, check avatar
    // create user object - create entyry in db
    // remove password and refreshToken field from response
    // check for user creation 
    // return response




    //req.body for access data send in the body. It allow you to recived payload that the client sends to the server
    const {username, email, fullname, password}= req.body
    // console.log("this is req.body ", req.body)

    
    //Basic
    // if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    // }


    //validation required all feild
    if ([fullname, email, username, password].some((fields)=>{
        return fields?.trim()=== ""
    })) {
        throw new ApiError(400, "All fields are required")
    }

    //Find existing user
    const existedUser = await User.findOne({
        $or:[{ username }, { email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with same email or username already exist") 
    }


    // requseting avatar and coverImg from client
    const avatarLocalPath =  req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path
    }


    // console.log("this is req. file" , req.files)

    //vaildation throw error if avatar file is not found 
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //uploading avatar on cloudinary which takes time so we have to wait
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    //creating user
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Finding the user . if this user is find then user is created
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})
 
const loginUser = asyncHandler(async(req, res) =>{
    // req body -> data
    // for login we use email and password || username and password
    //find the user
    // compare the credintial with already registered user 
    // - if match then gave acces and refresh token
    // else show error message
    // send cookies

    const {email, username, password} = req.body
    
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    // one of the field is required
    // if(!(username || email))

    //finding user threw email and username
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    // if user not exist throw error api message
    if(!user){
        throw new ApiError(404, "User does not exist")
    }
    // checking password is correst or not using the function
    const isPasswordvalid = await user.isPasswordCorrect(password)
    

    //if the password doesnt match throw api error
    if(!isPasswordvalid){
        throw new ApiError(401, "Invalid credentials")
    }

    // calling function to generate access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    // here we are calling database again because on line 130 we are making call but we are generating token below that so in user the token is empty, So we have to option 1- update the object 2- make a new call

    //here we are making new call to the database now we have bth the tokens 
    const loggedInUser = await User.findById(user._id).select(" -password -refreshToken")

    //sending cookies

    const option = {
        httpOnly: true,
        secure: true
    }

    //return res.status(200).cookie("accessToken", accessToken, option)
    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        ))

})

const logoutUser = asyncHandler(async(req, res)=>{
    //clean the cookie
    // clear the token from the User


    //here we are using this user with the help of auth.middleware
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged Out"
        )
    )

})

const refreshAccessToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id);
        
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
        //compairing incoming token with the user token
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        const option ={
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponse(
                200,
                 {accessToken, refreshToken:newRefreshToken},
                  "Access token refreshed"
                )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldpassword, newpassord} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid oldpassword")
    }
    user.password = newpassord
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200,
            {},
            "Password changed Successfully")
    )

})

const getCurrentUser = asyncHandler(async(req,res)=>{

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user, 
            "Current user fetched successfully")
    )
})

const updateAccountDetails= asyncHandler(async(req,res)=>{
    const {fullname, email}= req.body

    if(!fullname||!email){
        throw new ApiError(400, "All field are required");
    }
    const user = await User.findById(
        req.user?._id,
        {
            $set: {
                fullname: fullname,// or we can simply write fullname, email
                email: email
            }
        },
        {new: true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account detail verified")
        )

})

const updateUserAvatar = asyncHandler( async(req, res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading an avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "avatar is updated successfully")
        )
})

const updateUserCoverImage = asyncHandler( async(req, res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading an coverImage")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
        ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage is updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username}= req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscriber"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in:[req.User?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, channel[0], "Channel Fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}
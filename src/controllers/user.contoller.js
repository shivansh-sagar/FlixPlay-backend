import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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
    const avatarLocalPath =  req.files?.avatar[0]?.path;
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
 
export {
    registerUser
}
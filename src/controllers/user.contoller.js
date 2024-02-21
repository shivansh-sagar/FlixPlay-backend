import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const generateAccessAndRefereshTokens = async(userId)=>{

    try {
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
        console.log(accessToken)
       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave: false})
        console.log("hey im called")
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

    //return res.status(200).cookie("accessTokens", accessToken, option)
    return res
    .status(200)
    .cookie("accessTokens", accessToken, option)
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


export {
    registerUser,
    loginUser,
    logoutUser
}
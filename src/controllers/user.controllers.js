import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { response } from "express";

const generateAccessAndRefreshTokens = async(userId)=>{
  try {
    const user=await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken

    await user.save({validateBeforeSave: false})

    return {accessToken,refreshToken}


  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating access and refresh token")
  }
}

const registerUser=asyncHandler( async(req,res)=>{
  // get user details 
  // validation-check if fields are not empty
  // check if user is already registered-by username,email
  // check for images,avatar
  // upload them to cloudinary, avatar
  // create user object-entry in db
  // remove password and refresh token field from res
  // check for user creation
  // return res

  const {username,email,fullname,password}=req.body
  // console.log("email: ",email);

  if (
    [fullname,email,password,username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400,"All fields are required")
  }

  const existedUser=await User.findOne({
    $or:[{ username } ,{ email }]
  })

  if (existedUser) {
    throw new ApiError(409,"User with username or email already exists")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path
  // const coverImageLocalPath = req.files?.coverImage[0]?.path

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath=req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400,"Avatar file is Required")
  }

  const avatar=await uploadOnCloudinary(avatarLocalPath)
  const coverImage=await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400,"Avatar file is Required")
  }

  const user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
  })

  const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser,"user registered successfully")
  )
})

const loginUser=asyncHandler(async (req,res)=>{
  // req->body-data
  // username or email
  // find the user
  // password check
  // access and refresh token 
  //send cookies

  const {email,username,password}=req.body
  if (!email && !username) {
    throw new ApiError(400,"email and username is required")
  }

  const user = await User.findOne({
    $or:[{email},{username}]
  })

  if (!user) {
    throw new ApiError(404,"User does not exist")
  }

  const isValidPassword=await user.isPasswordCorrect(password)

  if(!isValidPassword){
    throw new ApiError(401,"Invalid user credentials")
  }

  const {accessToken,refreshToken} =await generateAccessAndRefreshTokens(user._id)

  const loggedInUser=await User.findOne(user._id).select("-password -refreshToken")

  const options={
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {
        user:loggedInUser,accessToken,refreshToken
      },
      "User logged In Successfully"
    )
  )
})

const logoutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.body._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
    {
      new:true
    }
  )

  const options={
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(
    new ApiResponse(
      200,
      {},
      "User Logged Out Successfully"
    )
  )

})

export {
  registerUser,
  loginUser,
  logoutUser
}
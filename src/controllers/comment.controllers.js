import { asyncHandler } from "../utils/asyncHandler";
import { Comment } from "../models/comment.models";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models";
import { User } from "../models/user.models";

const getVideoComments=asyncHandler(async(req,res)=>{
  const {videoId}=req.params
  const {page=1,limit=10}=req.query
  if(!isValidObjectId(videoId)){
    throw new ApiError(402,"Inavlid Video id")
  }
  const getVideo=await Video.findById(videoId)
  
  if(!getVideo){
    throw new ApiError(404,"Video not found")
  }

  const videoComments=await Comment.aggregate([
    {
      $match:{
        video: new mongoose.Types.ObjectId(videoId)
      },
    },
    {
      $lookup:{
        from:"users",
        localField:"owner",
        foreignField:"_id",
        as:"ownerOfComment",
        pipeline:[
          {
            $project:{
              fullname: 1,
              username: 1,
              avatar: 1
            }
          }
        ]
      },
    },
    {
      $addFields:{
        ownerOfComment:{
          $first:"$ownerOfComment"
        }
      }
    },
    {
      $sort:{
        createdAt:-1
      }
    },
    {
      $skip:parseInt(page)
    },
    {
      $limit:parseInt(limit)
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200,videoComments,"comments of a video fetched successfully")
  )
})

const addComment=asyncHandler(async(req,res)=>{
  const {content} = req.body;
  const {videoId} =req.params;
  if(!isValidObjectId(videoId)){
    throw new ApiError(402,"Inavlid Video id")
  }
  const getVideo=await Video.findById(videoId)
  if(!getVideo){
    throw new ApiError(404,"Video not found")
  }
  if(!content){
    throw new ApiError(402,"Content is Required")
  }
  const user = await User.findById(req.user?._id)
  if(!user){
    throw new ApiError(404,"User Not found")
  }
  const comment=await Comment.create({
    content,
    video: videoId,
    owner: user?._id
  })

  if(comment){
    return res.status(200).json(new ApiResponse(200,comment,"Comment created Successfully"))
  }
  else
  {
    throw new ApiError(401,"Error while creating comment")
  }

})

const updateComment=asyncHandler(async(req,res)=>{
  const {content} = req.body;
  if(!content){
    throw new ApiError(402,"Content Required")
  }
  const {commentId} = req.params;
  if(!isValidObjectId(commentId)){
    throw new ApiError(402,"Invalid Comment Id")
  }
  const updatedComment=await Comment.findByIdAndUpdate(
    commentId,
    {
      $set:{
        content
      }
    },
    {
      new:true
    }
  )

  if(!updateComment){
    throw new ApiError(404,"Error while updating the comment")
  }
  return res
  .status(200)
  .json(
    new ApiResponse(200,updatedComment,"Comment updated Successfully")
  )
})

const deleteComment=asyncHandler(async(req,res)=>{
  const {commentId}=req.params
  if(!isValidObjectId(commentId)){
    throw new ApiError(402,"Invalid comment id")
  }
  const deletedComment=await User.findByIdAndUpdate(commentId)

  if(!deleteComment){
    throw new ApiError(404,"Error while deleting the comment")
  }
  return res
  .status(200)
  .json(
    new ApiResponse(200,deletedComment,"Comment deleted successfully")
  )
})

export{
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
}
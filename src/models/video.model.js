import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
    {
        videoFile: {
            type: String, // cloudinary url
            required: true
        },
        thumbnails: {
            type: String, // cloudinary url
            required: true
        },
        title: {
            type: String,
            required: true
        },
        discription: {
            type: String, 
            required: true
        },
        duration: {
            type: Number, // cloudinary url gave video duration
            required: true
        },
        views: {
            type: Number, 
            default: 0
        },
        isPublished: {
            type: Boolean, // cloudinary url gave video duration
            default: true
        },
        owner:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }, { timestamps: true });

    videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema);

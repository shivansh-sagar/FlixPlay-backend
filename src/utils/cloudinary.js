import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localfilepath)=>{
    try {
        if(!localfilepath) return null
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto"
        })
        //file has been uploaded successfully
        // console.log("file is uploaded successfully", response.url);
       fs.unlinkSync(localfilepath);
    //    console.log("This is the response we are taalking about",response);
        return response
        
    } catch (error) {
        fs.unlinkSync(localfilepath) //remove the locally saved temporary file as the upload operation goes failed
    }
}


export {uploadOnCloudinary}
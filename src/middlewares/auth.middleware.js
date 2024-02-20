import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    //here we are requesting cookies
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    // here we are verify given token using a secret or a public key to get a decoded token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //now finding the id with the help of decoded token to get the user of that token
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    //now we have the user

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

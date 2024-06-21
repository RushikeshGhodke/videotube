import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiErrors.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiRespone } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // Steps
    // Take data from frontend - postman
    // validation
    // check if already exists - username and email
    // check for images, check for avatar
    // upload to cloudinary, avatar
    // create entry in DB
    // remove password and refresh token from response
    // check for user creation
    // return response

    const { username, email, fullname, password } = req.body;

    if (
        [fullname, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    console.log(req.files?.avatar[0]?.path);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is Required.");
    }

    

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar Image is Required.");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const isCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!isCreated) {
        throw new ApiError(500, "Something went wrong on Server");
    }

    return res
        .status(201)
        .json(new ApiRespone(200, isCreated, "User registered successfully"));
});

export { registerUser };

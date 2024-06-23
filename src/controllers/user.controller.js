import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiErrors.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiRespone } from "../utils/ApiResponse.js";
import { json } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ ValiditeBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating tokens.");
    }
};

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

const loginUser = asyncHandler(async (req, res) => {
    // get data
    // username / email
    // password
    // find the user
    // check password
    // access and refresh token generation
    // send secure cookie with response

    const { username, email, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required.");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(404, "Wrong Password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshtoken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiRespone(200, {
                user: loggedInUser,
                accessToken,
                refreshToken,
            })
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiRespone(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token not found");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Unauthorized RefreshToken");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Response token is expired.");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user?._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiRespone(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access Token Refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message);
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    console.log(oldPassword, newPassword);

    const user = await User.findById(req.user?.id);
    console.log(user);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    console.log(isPasswordCorrect);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
       .status(200)
       .json(new ApiRespone(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiRespone(200, req.user, "Current user fetched"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    
    return res
        .status(200)
        .json(new ApiRespone(200, user, "Avatar image updated successfully"));
});

const updateAvatarImage = asyncHandler(async (req, res) => {
    const avatarFileLocalPath = req.file?.path;

    if (!avatarFileLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarFileLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiRespone(200, user, "Avatar image updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiRespone(200, user, "Cover Image updated successfully"));
});


const getCurrentUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedTo: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(400, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiRespone(200, channel[0], "Channel doesn't exists.")
    )
});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localStorage: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        } 
    ])

    return res
    .status(200)
    .json(200, user[0].watchHistory, "Watch history fetched successfully.")
});

export {
    registerUser,
    loginUser,
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatarImage,
    updateCoverImage,
    getCurrentUserProfile,
    getWatchHistory
};

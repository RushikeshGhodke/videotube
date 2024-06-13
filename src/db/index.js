import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import "dotenv/config";

export const connect = async () => {
  try {
    const conn = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(`DB HOST: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MONGO DB CONNECTION ERROR: ${error}`);
  }
};

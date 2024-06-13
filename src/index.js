import express from "express";
import dotenv from "dotenv";
import { connect } from "./db/index.js";
import { app } from "./app.js";

const port = process.env.PORT || 4000;

dotenv.config({
  path: "./env",
});

connect()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on ${port}`);
    });
  })
  .catch((err) => {
    console.log(`MONGODB CONNECTION FAILED: ${err}`);
  });

// Importing mongoose to define and interact with MongoDB schemas.
const mongoose = require("mongoose");

// Defining the schema for the User model.
// The username field is a unique identifier and is required.
// The passwordHash field stores the hashed version of the user's password for security.
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
});

// Exporting the User model to be used in other parts of the application.
// Note: the first argument in mongoose.model() is the name of the collection.
module.exports = mongoose.model("User", userSchema);

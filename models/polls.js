// Importing mongoose to define and interact with MongoDB schemas.
const mongoose = require("mongoose");

// Defining the schema for the Poll model.
// The question field represents the poll's main question and is required.
// The options field is an array of objects, each containing an answer and a vote count.
// The createdBy field is a reference to the User model, linking the poll to the user who created it.
const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [
    {
      answer: String, // Each option contains a possible answer for the poll.
      votes: Number, // Tracks the number of votes for this specific answer.
    },
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Establishes a relationship between Poll and User.
});

// Exporting the Poll model to be used in other parts of the application.
module.exports = mongoose.model("Poll", pollSchema);

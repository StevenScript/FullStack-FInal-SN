const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Poll = require("./models/Polls");

const PORT = 3000;
const MONGO_URI = "mongodb://localhost:27017/keyin_test"; // kept as default

const app = express();
expressWs(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Serve static files
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "voting-app-secret",
    resave: false,
    saveUninitialized: false,
  })
);
let connectedClients = [];

// WebSocket endpoint for real-time events
app.ws("/ws", (socket, req) => {
  connectedClients.push(socket);

  socket.on("message", async (message) => {
    const data = JSON.parse(message);

    // Handle incoming vote events
    if (data.event === "new-vote") {
      await onNewVote(
        data.data.pollId,
        data.data.selectedOption,
        data.data.userId
      );
    }
  });

  socket.on("close", async () => {
    connectedClients = connectedClients.filter((c) => c !== socket);
  });
});

// Handle a new vote on a poll, update the database, and notify all clients
async function onNewVote(pollId, selectedOption, userId) {
  try {
    const poll = await Poll.findById(pollId);
    const user = await User.findById(userId);

    if (!poll || !user) return;

    const option = poll.options.find((opt) => opt.answer === selectedOption);
    if (option) {
      option.votes++;
      await poll.save();

      // Track that this user voted on this poll if not already recorded
      if (!user.votedPolls.includes(pollId)) {
        user.votedPolls.push(pollId);
        await user.save();
      }

      // Broadcast updated poll results to all connected clients
      for (const client of connectedClients) {
        client.send(
          JSON.stringify({
            event: "vote-updated",
            data: { pollId: poll._id, options: poll.options },
          })
        );
      }
    }
  } catch (error) {
    console.error("Error updating poll:", error);
  }
}

// Home page: If logged in, redirect to dashboard, else show sign-up/login options
// Also displays the current number of polls
app.get("/", async (req, res) => {
  if (req.session.user?.id) {
    return res.redirect("/dashboard");
  }
  // Count the number of polls in the database
  const pollCount = await Poll.countDocuments({});
  res.render("index/unauthenticatedIndex", {
    session: req.session,
    pollCount: pollCount,
  });
});

// Login page: If user is already logged in, go to dashboard; else show the login form
app.get("/login", (req, res) => {
  // Check if the user is already logged in by verifying if a user ID exists in the session
  if (req.session.user?.id) return res.redirect("/dashboard"); // Redirect to dashboard if logged in
  return res.render("login", { errorMessage: null, session: req.session }); // Render the login page with no error message
});

// Handle login form submission: authenticate user and set session
app.post("/login", async (req, res) => {
  // Destructure username and password from the request body
  const { username, password } = req.body;
  try {
    // Find the user in the database using the provided username
    const user = await User.findOne({ username });
    if (!user) {
      // If the user does not exist, render the login page with an error message
      return res.render("login", {
        errorMessage: "Invalid username or password",
        session: req.session,
      });
    }

    // Compare the provided password with the stored hashed password using bcrypt
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      // If the password is incorrect, render the login page with an error message
      return res.render("login", {
        errorMessage: "Invalid username or password",
        session: req.session,
      });
    }

    // Valid user: set the user session with user ID and username
    req.session.user = { id: user._id, username: user.username };
    // Redirect the user to the dashboard upon successful login
    return res.redirect("/dashboard");
  } catch (error) {
    // Log any errors encountered during the login process for debugging
    console.error(error);
    // Render the login page with a generic error message
    return res.render("login", {
      errorMessage: "Error logging in",
      session: req.session,
    });
  }
});

// Signup page: If logged in, redirect to dashboard; else show signup form
app.get("/signup", async (req, res) => {
  if (req.session.user?.id) {
    return res.redirect("/dashboard");
  }

  return res.render("signup", {
    errorMessage: null,
    session: req.session,
  });
});

// Handle signup form submission: create a new user, hash password, and set session
app.post("/signup", async (req, res) => {
  // Destructure username and password from the request body
  const { username, password } = req.body;
  try {
    // Check if a user with the same username already exists in the database
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // If the username is already taken, render the signup page with an error message
      return res.render("signup", {
        errorMessage: "Username already taken",
        session: req.session,
      });
    }

    // Hash the password for secure storage using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    // Create a new user instance with the username and hashed password
    const newUser = new User({ username, passwordHash });
    // Save the new user to the database
    await newUser.save();

    // Set session and redirect
    req.session.user = { id: newUser._id, username: newUser.username };
    return res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    return res.render("signup", {
      errorMessage: "Error signing up, please try again",
      session: req.session,
    });
  }
});

// Dashboard: Only accessible to authenticated users.
// Shows all polls and allows poll creation and voting.
app.get("/dashboard", async (req, res) => {
  // Checking if the user is logged in by verifying the presence of a user ID in the session
  if (!req.session.user?.id) {
    return res.redirect("/");
  }
  const polls = await Poll.find({});
  return res.render("index/authenticatedIndex", {
    polls,
    session: req.session,
  });
});

// Profile page: Only for authenticated users.
// Displays username and how many polls they've voted in.
app.get("/profile", async (req, res) => {
  if (!req.session.user?.id) {
    return res.redirect("/");
  }

  const user = await User.findById(req.session.user.id);
  if (!user) return res.redirect("/");

  const pollsVotedCount = user.votedPolls.length;
  return res.render("profile", {
    username: user.username,
    pollsVotedCount,
    session: req.session,
  });
});

// Create Poll page: Only for logged-in users
app.get("/createPoll", async (req, res) => {
  if (!req.session.user?.id) {
    return res.redirect("/");
  }

  return res.render("createPoll", { session: req.session });
});

// Handle poll creation form: save a new poll to the database, notify clients
app.post("/createPoll", async (req, res) => {
  if (!req.session.user?.id) {
    return res.redirect("/");
  }
  const { question, options } = req.body;
  const formattedOptions = Object.values(options).map((option) => ({
    answer: option,
    votes: 0,
  }));

  const pollCreationError = await onCreateNewPoll(
    question,
    formattedOptions,
    req.session.user.id
  );
  if (pollCreationError) {
    return res.render("createPoll", {
      errorMessage: pollCreationError,
      session: req.session,
    });
  }
  return res.redirect("/dashboard");
});

// Helper function: creates a new poll and broadcasts to connected clients
async function onCreateNewPoll(question, pollOptions, userId) {
  try {
    // Create a new Poll object with the provided data
    const newPoll = new Poll({
      question,
      options: pollOptions,
      createdBy: userId,
    });
    // Save the new poll to the database
    await newPoll.save();

    // Broadcast new poll to all clients
    for (const client of connectedClients) {
      client.send(
        JSON.stringify({
          event: "new-poll",
          data: {
            id: newPoll._id,
            question: newPoll.question,
            options: newPoll.options,
          },
        })
      );
    }

    return null;
  } catch (error) {
    console.error(error);
    return "Error creating the poll, please try again";
  }
}

// Logout: Destroy session and return to home page
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    return res.redirect("/");
  });
});

// Connect to MongoDB and start the server
mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));

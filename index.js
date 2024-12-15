const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");

const PORT = 3000;
//TODO: Update this URI to match your own MongoDB setup
const MONGO_URI = "mongodb://localhost:27017/keyin_test";
const app = express();
expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
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

//Note: Not all routes you need are present here, some are missing and you'll need to add them yourself.

app.ws("/ws", (socket, request) => {
  connectedClients.push(socket);

  socket.on("message", async (message) => {
    const data = JSON.parse(message);
    if (data.event === "new-vote") {
      await onNewVote(
        data.data.pollId,
        data.data.selectedOption,
        data.data.userId
      );
    }
  });

  async function onNewVote(pollId, selectedOption, userId) {
    try {
      const poll = await Poll.findById(pollId);
      const user = await User.findById(userId);

      if (!poll || !user) return;

      const option = poll.options.find((opt) => opt.answer === selectedOption);
      if (option) {
        option.votes++;
        await poll.save();

        // Record user voted poll if not already
        if (!user.votedPolls.includes(pollId)) {
          user.votedPolls.push(pollId);
          await user.save();
        }

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
  socket.on("close", async (message) => {
    connectedClients = connectedClients.filter((c) => c !== socket);
  });
});

async function onNewVote(pollId, selectedOption, userId) {
  try {
    const poll = await Poll.findById(pollId);
    const user = await User.findById(userId);

    if (!poll || !user) return;

    const option = poll.options.find((opt) => opt.answer === selectedOption);
    if (option) {
      option.votes++;
      await poll.save();

      // Record user voted poll if not already
      if (!user.votedPolls.includes(pollId)) {
        user.votedPolls.push(pollId);
        await user.save();
      }

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

app.get("/", async (request, response) => {
  if (request.session.user?.id) {
    return response.redirect("/dashboard");
  }

  response.render("index/unauthenticatedIndex", {});
});

// Route to render login page
app.get("/login", (req, res) => {
  // Check if the user is already logged verifying if a user ID exists in the session
  if (req.session.user?.id) return res.redirect("/dashboard"); // Redirect to dashboard if logged in
  return res.render("login", { errorMessage: null }); // Render the login page with no error message
});

// Route to handle login form submission
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
      });
    }

    // Compare the provided password with the stored hashed password using bcrypt
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      // If the password is incorrect, render the login page with an error message
      return res.render("login", {
        errorMessage: "Invalid username or password",
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
    return res.render("login", { errorMessage: "Error logging in" });
  }
});

app.get("/signup", async (request, response) => {
  if (request.session.user?.id) {
    return response.redirect("/dashboard");
  }

  return response.render("signup", { errorMessage: null });
});

// Handles user signup
app.post("/signup", async (req, res) => {
  // Destructure username and password from the request body
  const { username, password } = req.body;
  try {
    // Check if a user with the same username already exists in the database
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // If the username is already taken, render the signup page with an error message
      return res.render("signup", { errorMessage: "Username already taken" });
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
    });
  }
});

// Route for the dashboard, accessible only to authenticated users
app.get("/dashboard", async (request, response) => {
  // Checking if the user is logged in by verifying the presence of a user ID in the session
  if (!request.session.user?.id) {
    return response.redirect("/"); // send unauthentic users to the homepage
  }

  // Retrieving all polls from the database using the polls model
  const polls = await polls.find({});

  // Rendering the authenticated dashboard page with the retrieved polls
  // Passing the polls data and request object to the view for dynamic content generation
  return response.render("index/authenticatedIndex", { polls, request });
});

app.get("/profile", async (request, response) => {});

app.get("/createPoll", async (request, response) => {
  if (!request.session.user?.id) {
    return response.redirect("/");
  }

  return response.render("createPoll");
});

// Poll creation route
app.post("/createPoll", async (request, response) => {
  // Check if the user is authenticated
  if (!request.session.user?.id) {
    return response.redirect("/"); // Redirect unauthentic users home
  }
  const { question, options } = request.body;

  // Formatting options into the structure required by the Poll model
  // Each option includes an answer and initializes votes to 0
  const formattedOptions = Object.values(options).map((option) => ({
    answer: option,
    votes: 0,
  }));

  // Call the helper function to handle poll creation and check for errors
  const pollCreationError = await onCreateNewPoll(
    question,
    formattedOptions,
    request.session.user.id
  );
  if (pollCreationError) {
    // If an error occurs, re-render the poll creation page with an error message
    return response.render("createPoll", {
      errorMessage: pollCreationError,
      request,
    });
  }

  // Redirect to the dashboard upon successful poll creation
  return response.redirect("/dashboard");
});

// Helper function for creating a new poll
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

    // Notify all connected WebSockets about the new poll
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

    // Return null for successful poll creation
    return null;
  } catch (error) {
    console.error(error);
    // Error message to be displayed to the user
    return "Error creating the poll, please try again";
  }
}

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    // Destroying the current session and log any error
    if (err) console.error(err);
    return res.redirect("/"); // Redirecting to the homepage
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    )
  )
  .catch((err) => console.error("MongoDB connection error:", err));

/**
 * Handles creating a new poll, based on the data provided to the server
 *
 * @param {string} question The question the poll is asking
 * @param {[answer: string, votes: number]} pollOptions The various answers the poll allows and how many votes each answer should start with
 * @returns {string?} An error message if an error occurs, or null if no error occurs.
 */
async function onCreateNewPoll(question, pollOptions) {
  try {
    //TODO: Save the new poll to MongoDB
  } catch (error) {
    console.error(error);
    return "Error creating the poll, please try again";
  }

  //TODO: Tell all connected sockets that a new poll was added

  return null;
}

/**
 * Handles processing a new vote on a poll
 *
 * This function isn't necessary and should be removed if it's not used, but it's left as a hint to try and help give
 * an idea of how you might want to handle incoming votes
 *
 * @param {string} pollId The ID of the poll that was voted on
 * @param {string} selectedOption Which option the user voted for
 */
async function onNewVote(pollId, selectedOption) {
  try {
  } catch (error) {
    console.error("Error updating poll:", error);
  }
}

# Real-Time Voting Application

This application is a real-time voting platform where users can sign up, log in, create polls, vote on polls, and view results in real time. It demonstrates the use of Node.js, Express, WebSockets, EJS templates, and MongoDB.

## Author: Steven Norris

## Features

- **User Authentication**:  
  Users can register, log in, and log out. Passwords are securely hashed with `bcrypt`.

- **Homepage (Unauthenticated)**:  
  Displays a landing page prompting new users to log in or sign up.  
  Shows the total number of polls in the system.

- **Dashboard (Authenticated)**:  
  Accessible only to logged-in users.  
  Lists all polls or a prompt to create one if none exist.  
  Allows creation of multiple polls at any time.  
  Users can vote in any poll, and results update in real time via WebSockets.

- **Poll Creation**:  
  Only logged-in users can create polls.  
  Each poll includes a question and multiple vote options.

- **Real-Time Voting (WebSockets)**:  
  Votes are communicated via WebSockets, ensuring all connected clients see updates instantly.  
  Creating a new poll broadcasts it to all users, allowing them to see and vote immediately.

- **Profile Page**:  
  Displays the currently logged-in user’s username and the number of polls they have voted in.

- **Site Header**:  
  Implemented as an EJS partial.  
  Provides navigation links to Home, Dashboard, Profile, and Logout.  
  Logging out clears the session and returns the user to the homepage.

- **Deleting Own Polls** (Optional Feature Added):  
  Poll owners can delete their own polls directly from the dashboard.  
  A "Delete" button appears next to any poll created by the logged-in user.

## Technologies Used

- **Backend**: Node.js, Express, Express-Session
- **Database**: MongoDB (Mongoose for schema and queries)
- **Views**: EJS templates for server-side rendering
- **Real-Time**: WebSockets (via `express-ws`)
- **Authentication**: Sessions with `express-session` and password hashing with `bcrypt`
- **Frontend**: Basic HTML, CSS, EJS, and minimal client-side JavaScript for WebSocket integration

## Project Structure

```
project/
  index.js                 # Main server file
  models/
    User.js                # Mongoose model for users
    Polls.js               # Mongoose model for polls
  public/
    styles.css             # Stylesheet for the application
    frontend.js            # Client-side WebSocket handlers
  views/
    partials/
      header.ejs           # Header partial
    index/
      unauthenticatedIndex.ejs
      authenticatedIndex.ejs
    createPoll.ejs
    login.ejs
    profile.ejs
    signup.ejs
```

## Setting Up

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Run MongoDB**:  
   Ensure MongoDB is installed and running:

   ```bash
   mongod
   ```

   By default, the app expects MongoDB on `mongodb://localhost:27017/keyin_test`. Update `MONGO_URI` in `index.js` if needed!

3. **Start the Server**:

   ```bash
   node index.js
   ```

   The server will run at `http://localhost:3000`.

4. **Access the Application**:
   - Open `http://localhost:3000` in your browser.
   - Sign up as a new user.
   - Upon successful signup or login, you will be directed to the dashboard.

## Interacting with the Application

- **Sign Up**: Create a new account. Your password will be hashed and stored securely.
- **Log In**: Access the dashboard, create polls, vote, and view your profile.
- **Create Polls**: From the dashboard, click "Create a New Poll" to create a poll with multiple options.
- **Vote in Polls**: Click the "Vote" button next to each option. Results update instantly for all users.
- **View Profile**: Access the profile page to see your username and how many unique polls you have voted in.
- **Delete Own Polls**: If you created a poll, a "Delete" button will appear next to it on the dashboard, allowing you to remove it.

## Real-Time Updates

When you create or vote on a poll:

- **Creation**: All connected clients are notified of the new poll via a "new-poll" WebSocket event.
- **Voting**: Votes trigger a "vote-updated" WebSocket event so every user watching the poll sees the updated totals immediately.

## Security and Data Integrity

- **Passwords**: Stored as bcrypt hashes, never plain text.
- **Session Management**: Managed through `express-session`, ensuring authenticated routes are protected.
- **Ownership Checks**: Before deleting a poll, the server checks if the currently logged-in user is the poll’s creator.

## Customization

- **Database URL**: Update `MONGO_URI` in `index.js` for a different MongoDB instance.
- **Styles**: Modify `public/styles.css` to change the look and feel.
- **WebSocket Events**: Modify `frontend.js` and the server's WebSocket logic to customize real-time features.

## Future Improvements

- Add pagination or search if the number of polls grows large.
- Improve UI/UX with more detailed poll statistics.
- Add better error handling and input validation.

// Establish a WebSocket connection to the server
const socket = new WebSocket("ws://localhost:3000/ws");

// Listen for messages from the server
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.event === "new-poll") {
    onNewPollAdded(data.data);
  } else if (data.event === "vote-updated") {
    onIncomingVote(data.data);
  }
});

/**
 * Handles adding a new poll to the page when one is received from the server
 *
 * @param {*} data The data from the server (ideally containing the new poll's ID and it's corresponding questions)
 */
function onNewPollAdded(data) {
  const pollContainer = document.getElementById("polls");
  const li = document.createElement("li");
  li.classList.add("poll-container");
  li.id = data.id;

  const h2 = document.createElement("h2");
  h2.textContent = data.question;
  li.appendChild(h2);

  const ul = document.createElement("ul");
  ul.classList.add("poll-options");
  for (const opt of data.options) {
    const optLi = document.createElement("li");
    optLi.id = `${data.id}_${opt.answer}`;
    optLi.innerHTML = `<strong>${opt.answer}:</strong> ${opt.votes} votes`;
    ul.appendChild(optLi);
  }
  li.appendChild(ul);

  const form = document.createElement("form");
  form.classList.add("poll-form", "button-container");
  for (const opt of data.options) {
    const btn = document.createElement("button");
    btn.classList.add("action-button", "vote-button");
    btn.type = "submit";
    btn.value = opt.answer;
    btn.name = "poll-option";
    btn.textContent = `Vote for ${opt.answer}`;
    form.appendChild(btn);
  }
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.style.display = "none";
  hiddenInput.value = data.id;
  hiddenInput.name = "poll-id";
  form.appendChild(hiddenInput);

  form.addEventListener("submit", onVoteClicked);
  li.appendChild(form);

  pollContainer.appendChild(li);
}

/**
 * Handles updating the number of votes an option has when a new vote is recieved from the server
 *
 * @param {*} data The data from the server (probably containing which poll was updated and the new vote values for that poll)
 */
function onIncomingVote(data) {
  for (const option of data.options) {
    const li = document.getElementById(`${data.pollId}_${option.answer}`);
    if (li) {
      li.innerHTML = `<strong>${option.answer}:</strong> ${option.votes} votes`;
    }
  }
}

/**
 * Handles processing a user's vote when they click on an option to vote
 *
 * @param {FormDataEvent} event The form event sent after the user clicks a poll option to "submit" the form
 */
function onVoteClicked(event) {
  //Note: This function only works if your structure for displaying polls on the page hasn't changed from the template. If you change the template, you'll likely need to change this too
  event.preventDefault();
  const formData = new FormData(event.target);
  const pollId = formData.get("poll-id");
  const selectedOption = event.submitter.value;

  //TOOD: Tell the server the user voted
  socket.send(
    JSON.stringify({ event: "new-vote", data: { pollId, selectedOption } })
  );
}

//Adds a listener to each existing poll to handle things when the user attempts to vote
document.querySelectorAll(".poll-form").forEach((pollForm) => {
  pollForm.addEventListener("submit", onVoteClicked);
});

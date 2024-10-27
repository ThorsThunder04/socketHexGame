/* (Thor)
 TODO make player colors work with css instead of hardcoding them to each element (would then just require changing a css class in an element)
 TODO make it so that you can't join the game if your name is empty (string = "") or whitespace
*/
let socket = io();

let joinButton = document.getElementById("join");
let leaveButton = document.getElementById("leave");
const SPECTATOR_CONTROLS = [bStart, bBack, bForward, bLive];
let COLORS; // gets the colors from hexagoneScript.js createTable socket call
let currUsername; // username string
let colorIndex; // which color the player is (if they are a player)

function join() {
    console.log(nick.value + " joining the the party");

    socket.emit("newPlayer", nick.value);
}

function leave() {
    console.log("leaving the party");

    leaveButton.setAttribute("disabled", "disabled");
    joinButton.removeAttribute("disabled");
    playerList.innerHTML = "";
    sendMes.setAttribute("disabled", "disabled");
    SPECTATOR_CONTROLS.map(e => e.removeAttribute("disabled"));
    playerName.style.display = "none";

    socket.emit("playerLeave");
}

function send() {
    let message = inputMes.value + "\n";
    inputMes.value = "";
    socket.emit("sentMessage", message);
}

function spectStart() {
    socket.emit("changeView", 0);
}
function spectStepBack() {
    socket.emit("changeView", 1);
}
function spectStepForward() {
    socket.emit("changeView", 2);
}
function spectLive() {
    socket.emit("changeView", 3);
}

// displays a message saying who's it is depending on the coin's value
function displayWhosTurn(coin) {
    let playerColor = COLORS[coin%2];
    whosTurn.style.color = playerColor;
    //TODO the color in this will be changed to be the player's name
    whosTurn.innerHTML = "It's " + playerColor + "'s Turn!!!";
}

function resetGame() {
    socket.emit("resetGame");
}

socket.on("currentPlayers", data => {
    if (data.length == 2 && bStart.getAttribute("disabled") != "disabled")
        joinButton.setAttribute("disabled", "disabled");
    else if (joinButton.getAttribute("disabled") == "disabled"
            && leaveButton.getAttribute("disabled") == "disabled")
        joinButton.removeAttribute("disabled");

    playerList.innerHTML = "";
    console.log(data);
    for (let c in data) {
        playerList.innerHTML += data[c] + " ";
    }
});

socket.on("joinSuccess", data => {
    [ currUsername, colorIndex ] = data;

    // disable/enable buttons so that a player only uses buttons they're supposed to
    joinButton.setAttribute("disabled", "disabled");
    leaveButton.removeAttribute("disabled");
    sendMes.removeAttribute("disabled");
    SPECTATOR_CONTROLS.map(e => e.setAttribute("disabled", "disabled"));

    // set html element displaying to the user their username and color
    playerName.style.color = COLORS[colorIndex];
    playerName.innerHTML = "You are " + currUsername;
    playerName.style.display = "block";
    displayWhosTurn(0); // both players are in the middle of joining, so the turn is still at 0
});

socket.on("joinFailed", data => {
    console.log(data);
});

socket.on("loadGameTable", data => {
    let {table, colors} = data;
    //console.log(table);
    for (let y in table) {
        for (let x in table) {
            let id = parseInt(y)*table.length + parseInt(x);
            if (table[y][x] !== -1) {
                d3.select("#h" + id).attr("fill", colors[table[y][x]]);
            } else {
                d3.select("#h" + id).attr("fill", "#C3DBDB");
            }
        }
    }
    winnerMessage.style.display = "none";
});

socket.on("newView", data => {
    if (data.goBack) {
        d3.select("#h" + data.change[0]).attr("fill", "#C3DBDB");
    } else
        d3.select("#h" + data.change[0]).attr("fill", data.change[1]);
});

socket.on("newMessage", data => {
    chat.value += ( data + "\n");
});

socket.on("justPlayed", data => {
    let {tile, coin} = data;
    coin = parseInt(coin);
    d3.select("#h"+tile).attr("fill", COLORS[coin%2]);
    displayWhosTurn(coin+1);
});

//implement
socket.on("winner", data => {
    winnerMessage.innerHTML = `${data["winner"]} IS THE WINNER!!!`;
    winnerMessage.style.color = data["color"];
    winnerMessage.style.display = "block";
    console.log(data);
});

leaveButton.setAttribute("disabled",  "disabled");
sendMes.setAttribute("disabled", "disabled");
chat.value = ""; // erases the chat on reload / new tab


// So that hitting Enter in input field automatically presses the button
document.getElementById("nick")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") join();
    });
document.getElementById("inputMes")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") send();
    });

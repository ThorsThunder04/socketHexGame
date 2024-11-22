let socket = io();

let COLORS; // gets the colors from hexagoneScript.js createTable socket call
let currUsername; // username string
let colorIndex; // which color the player is (if they are a player)
const INIT_COLOR_HEX = "#293c3c"; // color of the hexagon tile at the start of the game

function join() {
    // check to avoid whitespace/empty username (is also checked server side)
    if (nick.value.trim() == "") {
        console.log("Must give none whitespace username to join the game");
        return;
    }
    console.log(nick.value + " joining the the party");
    socket.emit("newPlayer", nick.value);
}

function leave() {
    console.log("leaving the party");

    playerList.innerHTML = "";
    sendMes.setAttribute("disabled", "disabled");
    inParty.style.display = "none";
    joinDiv.style.display = "block";
    spectatorButtons.style.display = "block";

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

// displays a message saying whose turn it is depending on the coin's value
function displayWhoseTurn(coin) {
    if (coin != 0) {
        document.getElementById("PN" + ((coin-1)%2)).innerHTML = "";
    }
    let next = document.getElementById("PN" + (coin%2));
    // TODO make the whole name + arrows light up 
    // currently cant do it bc of the same issue as in the closest comment down
    next.innerHTML = ">>"
    next.style.color = COLORS[coin%2];
}

function resetGame() {
    socket.emit("resetGame");
}

socket.on("waiting", (callback) => {
    callback("got it!");
}) 

socket.on("currentPlayers", data => {
    playerList.innerHTML = "Current players:<br/>";
    console.log(data);
    for (let c in data) {

        // place username into field where it will be displayed
        //! Should idealy be revisited slightly to avoid XSS vulnerability (since data[c] is direct user input)
        if (document.getElementById(data[c]) == null) {
            playerList.innerHTML += (`<div id=${data[c]}><div id=${'PN'+c} class="arrows"></div> ${data[c]}</div>`);
            displayWhoseTurn(0); // both players are in the middle of joining, so the turn is still at 0
        }

    }
});

socket.on("joinSuccess", data => {
    [ currUsername, colorIndex ] = data;

    // disable/enable buttons so that a player can only click buttons they're supposed to
    sendMes.removeAttribute("disabled");
    spectatorButtons.style.display = "none"

    // set html element displaying to the user their username and color
    playerName.style.color = COLORS[colorIndex];
    playerName.innerHTML = "Hello, " + currUsername;
    inParty.style.display = "block";
    joinDiv.style.display = "none";
});

socket.on("joinFailed", data => {
    alert("Couldn't join. " + data);
    console.log(data);
});

socket.on("loadGameTable", data => {
    // reset after a finished game
    if (winnerContainer.style.display == "flex") {
        winnerContainer.style.display == "none";
        greyOut.style.display = "none";
    }

    let {table, colors} = data;
    for (let y in table) {
        for (let x in table) {
            let id = parseInt(y)*table.length + parseInt(x);
            if (table[y][x] !== -1) {
                d3.select("#h" + id).attr("fill", colors[table[y][x]]);
            } else {
                d3.select("#h" + id).attr("fill", INIT_COLOR_HEX);
            }
        }
    }
    winnerContainer.style.display = "none";
});

socket.on("newView", data => {
    if (data.goBack) {
        d3.select("#h" + data.change[0]).attr("fill", INIT_COLOR_HEX);
    } else
        d3.select("#h" + data.change[0]).attr("fill", data.change[1]);
});

socket.on("newMessage", data => {
    let [ msgContent, msgType, msgIDNum, msgUser] = data; 
    let dim = (msgIDNum%2 != 0) ? "dimmedMsg" : ""; // dim if message has odd number ID
    let preparedMessage = `<div class="chatMessage ${msgType} ${dim}">`;
    if (msgType == "userMsg" && msgUser != undefined) {
        preparedMessage += `<span class="chatUsername">${msgUser}</span>`;
    }
    let messageID = "m" + msgIDNum;
    preparedMessage += `<div id="${messageID}"></div></div>`;

    // we separate these two so that there can't be an XSS attack where someone
    // sends code in through the chat box (which would be sent to every client, even spectators)
    //TODO since new message appear at top, if you are scrolled down and someone sends a message, everything shifts down. See if we can cancel this shift when scrolled downwards
    chatbox.innerHTML = preparedMessage + chatbox.innerHTML; // new chats will always be at top
    document.getElementById(messageID).textContent = msgContent;
});

socket.on("justPlayed", data => {
    let {tile, coin} = data;
    coin = parseInt(coin);
    d3.select("#h"+tile).attr("fill", COLORS[coin%2]);
    displayWhoseTurn(coin+1);
});

socket.on("winner", data => {
    document.getElementsByTagName("p")[0].innerHTML = `${data["winner"]} IS THE WINNER!!!`;
    winnerMessage.className = "winner" + data["playerNb"];
    greyOut.style.display = "flex";
    winnerContainer.style.display = "flex";
    console.log(data);
});

sendMes.setAttribute("disabled", "disabled");


// So that hitting Enter in input field automatically presses the button
document.getElementById("nick")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") join();
    });
document.getElementById("inputMes")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") send();
    });

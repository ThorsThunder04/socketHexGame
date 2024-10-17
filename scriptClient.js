let socket = io();
let gameStop = false; // indicates whether a spectator is following the game live

let joinButton = document.getElementById("join");
let leaveButton = document.getElementById("leave");


function join() {
    let n = document.getElementById("name").value;
    console.log(n + " joining the the party");
    socket.emit("newPlayer", n);
    joinButton.setAttribute("disabled", "disabled");
    leaveButton.removeAttribute("disabled");
    sendMes.removeAttribute("disabled");
}

function leave() {
    console.log("leaving the party");
    leaveButton.setAttribute("disabled", "disabled");
    joinButton.removeAttribute("disabled");
    playerList.innerHTML = "";
    sendMes.setAttribute("disabled", "disabled");
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

socket.on("currentPlayers", data => {
    playerList.innerHTML = "";
    console.log(data);
    for (let c in data) {
        playerList.innerHTML += data[c] + " ";
    }
})


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
    if (gameStop) return; // spectator isnt following the game
    d3.select("#h"+data.tile).attr("fill", data.color);
});

//implement
socket.on("winner", data => {
    console.log(data);
});

leaveButton.setAttribute("disabled",  "disabled");
sendMes.setAttribute("disabled", "disabled");
chat.value = ""; // erases the chat on reload / new tab


// So that hitting Enter in input field automatically presses the button
document.getElementById("name")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") join();
});
inputMes.addEventListener("keypress", (e) => {
    if (e.key == "Enter") send();});

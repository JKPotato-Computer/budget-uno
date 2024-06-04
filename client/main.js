// prevent using up my precious Render server :(
const isSafe = ['localhost', '127.0.0.1', '::1'].includes(location.hostname) || /^\d+(\.\d+){3}$/.test(location.hostname) || req.url.startsWith('file://');
let socket = io((isSafe) ? ("") : ("https://budget-uno.onrender.com"));

let serverID = "";		
let socketData;
let serverIDList = [];

socket.on("updateServerList", function(list) {
	serverIDList = list;

	while (document.querySelector("#serverList").firstChild) {
		document.querySelector("#serverList").removeChild(document.querySelector("#serverList").lastChild);
	}

	for (const id of serverIDList) {
		const serverButton = document.createElement("button");
		serverButton.textContent = id;
		document.querySelector("#serverList").appendChild(serverButton);

		serverButton.onclick = function() {
			socket.emit("serverJoin",id);
		}
	}
});

socket.on("serverStatsChange", function(data) {
	document.querySelector("#serverSockets").textContent = "Sockets: " + Object.keys(data.playerList).length;
	while (document.querySelector("#playerList").firstChild) {
		document.querySelector("#playerList").removeChild(document.querySelector("#playerList").lastChild)
	}

	for (const id in data.playerList) {
		const playerData = data.playerList[id];
		const playerDiv = document.createElement("div");

		const playerLabel = document.createElement("span");
		playerLabel.textContent = ((data.leader == id) ? ("LEADER: ") : ("")) + playerData.name;

		const kickButton = document.createElement("button")
		kickButton.textContent = "Kick";

		const transferButton = document.createElement("button");
		transferButton.textContent = "Transfer";

		kickButton.onclick = function() {
			socket.emit("kickPlayer",id,serverID);
		}

		transferButton.onclick = function() {
			socket.emit("transferOwnership",id,serverID);
		}

		playerDiv.appendChild(playerLabel);

		if ((data.leader != id) && (data.leader == socketData.id)) {
			playerDiv.appendChild(kickButton);
			playerDiv.appendChild(transferButton);
		}

		document.querySelector("#playerList").appendChild(playerDiv);
	}
});

socket.on("setClientSocketData", function(data) {
	socketData = data;
});

socket.on("serverLeave", function(id) {
	document.querySelector("#serverID").className = "invisible";
	document.querySelector("#leaveServer").className = "invisible";
	document.querySelector("#serverSockets").className = "invisible";
	document.querySelector("#serverID").textContent = "";
	document.querySelector("#leaveServer").className = "invisible";
	document.querySelector("#destroyServer").className = "invisible";
	serverID = "";

	while (document.querySelector("#playerList").firstChild) {
		document.querySelector("#playerList").removeChild(document.querySelector("#playerList").lastChild)
	}
})

socket.on("serverJoin", function(id) {
	document.querySelector("#serverID").className = "";
	document.querySelector("#leaveServer").className = "";
	document.querySelector("#serverSockets").className = "";
	document.querySelector("#serverID").textContent = "Server ID: " + id;
	serverID = id;
})

document.querySelector("#createPubServer").onclick = function() {
	socket.emit("createServer","public");
	document.querySelector("#destroyServer").className = "";
}

document.querySelector("#createPrivServer").onclick = function() {
	socket.emit("createServer","private");
	document.querySelector("#destroyServer").className = "";
}

document.querySelector("#submitCode").onclick = function() {
	socket.emit("serverJoin","G-" + document.querySelector("#codeEnter").value);
}

document.querySelector("#leaveServer").onclick = function() {
	socket.emit("serverLeave",serverID);
}

document.querySelector("#destroyServer").onclick = function() {
	socket.emit("forceClear",serverID);
}

document.querySelector("#usernameField").onchange = function() {
	socketData.name = this.value;
}

document.querySelector("#save").onclick = function() {
	if (serverID) {
		socket.emit("updateData",socketData,serverID)
	} else {
		socket.emit("updateData",socketData)
	}
}
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
   }
});

const PORT = process.env.PORT || 3000;

let SOCKET_LIST = {}; // Socket Ids
let SOCKET_DATA = {}; // Socket Info
let AVAILABLE_SERVERS = {};

server.listen(PORT, () => {
	console.log("Server running!")
});

app.use(express.static(__dirname + "/client"));

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/client/index.html");
})

function createPublicServerInfo(serverID) {
	let server = AVAILABLE_SERVERS[serverID]
	let publicServerInfo = {
		leader: server.leader,
		playerList : server.playerList
	}

	return publicServerInfo
}

function countForSockets(serverID,returnList) {
	let socketList = [];
	for (const socketID in SOCKET_LIST) {
		let sockets = SOCKET_LIST[socketID];
		if (sockets.rooms.has(serverID)) {
			socketList.push(sockets);
		}
	}
	return (returnList) ? socketList : socketList.length;
}

function updatePlayerInfo(socketID) {
	for (const serverID in AVAILABLE_SERVERS) {
		const serverData = AVAILABLE_SERVERS[serverID];
		if (serverData.playerList[socketID]) {
			serverData.playerList[socketID] = SOCKET_DATA[socketID];
		}
	}
}

function serverStatsChange(serverID) {
	for (const sID in SOCKET_LIST) {
		let iSocket = SOCKET_LIST[sID];
		if (iSocket.rooms.has(serverID)) {
			iSocket.emit("serverStatsChange",createPublicServerInfo(serverID));
		}
	}
}

function updateServerList(socket) {
	let publicServers = []
	for (const serverID in AVAILABLE_SERVERS) {
		let server = AVAILABLE_SERVERS[serverID]	

		if (server.publicServer) {
			publicServers.push(serverID);
		}
	}

	if (socket) {
		socket.emit("updateServerList",publicServers)
	} else {
		io.emit("updateServerList",publicServers)
	}
}

function leaveRoom(serverID,socket) {

	delete AVAILABLE_SERVERS[serverID].playerList[socket.id]
	socket.leave(serverID);

	if (socket.id == AVAILABLE_SERVERS[serverID].leader) {
		// Choose random leader
		const currentPlayers = Object.keys(AVAILABLE_SERVERS[serverID].playerList);
		const randomNumber = currentPlayers[Math.floor(Math.random() * currentPlayers.length)];
		AVAILABLE_SERVERS[serverID].leader = randomNumber;
	}

	serverStatsChange(serverID);
	socket.emit("serverLeave");
}


io.sockets.on("connection", function(socket) {

	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	SOCKET_DATA[socket.id] = {
		 name : "",
		 id: socket.id
	};

	updateServerList(socket);

	// User Data

	socket.emit("setClientSocketData",SOCKET_DATA[socket.id])

	socket.on("updateData",function(data,serverId) {
		SOCKET_DATA[socket.id] = data;
		updatePlayerInfo(socket.id);

		if (serverId) {
			serverStatsChange(serverId);
		}
	});

	// Servers

	socket.on("createServer",function(visibility) {
		if (socket.rooms.size > 0) {
			return;
		}	

		const zeroPad = (num, places) => String(num).padStart(places, '0')

		let IDList = [];
		let serverID = "G-";
		let serverData = {
			leader: socket.id, // Creator's 'Socket ID
			publicServer : (visibility == "public") ? true : false,
			playerList : {
				[socket.id] : SOCKET_DATA[socket.id]
			}
		}

		for (let i =0;i < 3;i++) {
			IDList[i] = zeroPad(Math.floor(Math.random() * 1000),3);
		}

		serverID = "G-" + IDList.join("");
		
		AVAILABLE_SERVERS[serverID] = serverData;
		socket.join(serverID);
		socket.emit("serverJoin",serverID);
		serverStatsChange(serverID);
		
		if (visibility == "public") {
			updateServerList();
		}
	});

	socket.on("forceClear",function(serverID) {
		for (const sID in SOCKET_LIST) {
			let iSocket = SOCKET_LIST[sID];
			if (iSocket.rooms.has(serverID)) {
				iSocket.leave(serverID);
				iSocket.emit("serverLeave");
			}
		}
		countForSockets(serverID);
	});

	socket.on("serverJoin",function(serverID) {
		if (!AVAILABLE_SERVERS[serverID]) {
			return;
		}

		for (const serverID in AVAILABLE_SERVERS) {
			if (socket.id in AVAILABLE_SERVERS[serverID].playerList) {
				return;
			}
		}
		
		AVAILABLE_SERVERS[serverID].playerList[socket.id] = SOCKET_DATA[socket.id];

		socket.join(serverID);
		socket.emit("serverJoin",serverID);
		serverStatsChange(serverID);
	});

	socket.on("serverLeave",function(serverID) {
		if (!AVAILABLE_SERVERS[serverID]) {
			return;
		}

		leaveRoom(serverID,socket);
	});

	socket.on("kickPlayer",function(playerID,serverID) {
		let server = AVAILABLE_SERVERS[serverID];
		if (server.leader != socket.id) {
			return;
		}

		leaveRoom(serverID,SOCKET_LIST[playerID]);
	});
	
	socket.on("transferOwnership",function(playerID,serverID) {
		let server = AVAILABLE_SERVERS[serverID];
		
		if (server.leader != socket.id) {
			return;
		}

		server.leader = playerID;
		serverStatsChange(serverID);
	});
	
	socket.on("disconnect", function() {

		// Leave All Servers
		let rooms = socket.rooms.keys();
		for (const room of rooms) {
			leaveRoom(room,socket);
		}

		delete SOCKET_LIST[socket.id];
	});
});

setInterval(function() {
	for (const serverID in AVAILABLE_SERVERS) {	

		if (countForSockets(serverID) == 0) {
			let publicServer = AVAILABLE_SERVERS[serverID].publicServer;
			console.log("Server closed/at 0: G-" + serverID);
			delete AVAILABLE_SERVERS[serverID];

			if (publicServer) {
				updateServerList();
			}
		}
	}
},(1000/25))
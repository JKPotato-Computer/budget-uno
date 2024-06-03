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

io.sockets.on("connection", function(socket) {
	function countForSockets(serverID) {
		let i = 0;
		let socketList = [];
		for (const socketID in SOCKET_LIST) {
			let sockets = SOCKET_LIST[socketID];
			if (sockets.rooms.has(serverID)) {
				i++;
				socketList.push(sockets.id);
			}
		}
		return i;
	}

	function serverStatsChange(serverID) {
		let data = {
			sockets: countForSockets(serverID)
		};

		for (const sID in SOCKET_LIST) {
			let iSocket = SOCKET_LIST[sID];
			if (iSocket.rooms.has(serverID)) {
				iSocket.emit("serverStatsChange",data);
			}
		}
	}

	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	SOCKET_DATA[socket.id] = {
		 name : ""
	};

	// User Data

	// Servers

	socket.on("createServer",function() {
		const zeroPad = (num, places) => String(num).padStart(places, '0')

		let IDList = [];
		let serverID = "G-";
		let serverData = {
			leader: socket.id, // Creator's 'Socket ID
			playerList : {
				socket.id
			}
		}

		for (let i =0;i < 3;i++) {
			IDList[i] = zeroPad(Math.floor(Math.random() * 100),3);
		}

		serverID = "G-" + IDList.join("");
		
		AVAILABLE_SERVERS[serverID] = serverData;
		socket.join(serverID);
		socket.emit("serverJoin",serverID);
		serverStatsChange(serverID);
	})

	socket.on("forceClear",function(serverID) {
		for (const sID in SOCKET_LIST) {
			let iSocket = SOCKET_LIST[sID];
			if (iSocket.rooms.has(serverID)) {
				iSocket.leave(serverID);
				iSocket.emit("serverLeave");
			}
		}
		countForSockets(serverID);
	})

	socket.on("serverJoin",function(serverID) {
		if (!AVAILABLE_SERVERS[serverID]) {
			return;
		}

		socket.join(serverID);
		socket.emit("serverJoin",serverID);
		serverStatsChange(serverID);
	})

	socket.on("serverLeave",function(serverID) {
		if (!AVAILABLE_SERVERS[serverID]) {
			return;
		}

		socket.leave(serverID);
		socket.emit("serverLeave");
		serverStatsChange(serverID);

		if (countForSockets(serverID) == 0) {
			console.log("Server closed/at 0: G-" + serverID);
			delete AVAILABLE_SERVERS[serverID];
		}
	})
	
	socket.on("disconnect", function() {

		// Leave All Servers
		let rooms = socket.rooms.keys();
		for (const room of rooms) {
			socket.leave(room);
		}

		delete SOCKET_LIST[socket.id];
	});
});
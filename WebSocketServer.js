const WebSocketServer = require('websocket').server;
const http = require('http');
const db = require('../database/database.js');

const fs = require('fs');
var sockets = [];
var nameList = [];
var socketsToWriteTo = [];

var chatHistory = (function(){
	var history = [];
	return{
		add: function(data){
			if(history.length === 20){
				history.splice(0, 1);
			}
			history.push(data);
		},
		get: function(){
			return history;
		}
	};
}());

var nameSocketMapping = (function(){
	var mapping = {};
	return {
		add: function(name, socket) {
			mapping[name] = socket;
		},
		get: function(name) {
			return mapping[name];
		}
	}
}());

var server = http.createServer(function(req, res){
	console.log('http connected');
	var url = req.url;
	if(url === '/'){
		url = '/html.html';
	}try {
		res.write(getPage('/home/agentpietrucha/node/chat' + url));
	} catch (e) {}
	res.end();
});
server.listen(8081)

function getPage(path){
	return fs.readFileSync(path).toString();
}

const wss = new WebSocketServer({
	httpServer: server
});

wss.on('request', function(request) {
	var socket = request.accept('chat-protocol', request.origin);
	sockets.push(socket);
	var name = '';
	var hasName = false;
	var asked = false;
	var numMessagesFromClient = 0;
	var personToSend;
	console.log('number of sockets: ' + sockets.length);
	console.log('WS connected');
	sendJSON('connection', sockets, null, 'connected');

	socket.on('message', function(data){
		var data = JSON.parse(data.utf8Data);
		console.log('DATATYPE: ', data.type);
		switch (data.request) {
			case 'chat':
				sendJSON('activeUsersList', sockets, null, nameList);
				if(data.type === 'nickname'){
					if(nameList.indexOf(data.name) !== -1){
						sendJSON('userError', [socket], null, 'Choose another name');
						return;
					}
					name = data.name;
					nameList.push(name);
					nameSocketMapping.add(name, socket);
					console.log('NAME SET TO: ' + name);
					console.log('NAMELIST: ' + nameList + '\n');
					sendJSON('activeUsersList', sockets, null, nameList);
				}
				console.log('activeUsers: ', nameList + '\n');
				if(data.type === 'toWho'){
					if(nameList.indexOf(data.name) === -1 || data.name === name){
						sendJSON('userError', [socket], null, 'user not found');
						return;
					} else{
						personToSend = data.name;
						console.log('PERSON SET:' + personToSend);
					}
				}

				if (data.type === 'message'){
					console.log('MESSAGE FROM: ' + name + ': ' + data);
					sendJSON('message', [nameSocketMapping.get(personToSend)], name, data.message);
				}
				break;
			case 'registration':
				db.isAvailable(data.email, function (isAvailable) {
					if (isAvailable) {
						console.log('is true');
						db.add(data.username, data.email, data.password);
						sendJSON('accountAvailable', [socket], null, null);
					} else {
						console.log('is false');
						sendJSON('userError', [socket], null, 'this email is already taken');
					}
				});
				console.log('username', data.username);
				console.log('email: ', data.email);
				console.log('password: ', data.password);
				break;
			case 'login':
				db.login(data.email, data.password);
				sendJSON('message', [socket], null, 'logged in!');
				break;
			default:
				return;
		}
	});
	socket.on('close', function(error){
		// console.log('ERROR', error);
		sockets.splice(sockets.indexOf(socket), 1);
		if(nameList.indexOf(name) !== -1){
			nameList.splice(nameList.indexOf(name), 1);
		}
		console.log(name + 'left conversation');
		sendJSON('activeUsersList', sockets, null, nameList);
		console.log('ACTIVEUSERS', nameList);
	});
});
function sendJSON(type, sockets, fromWho, message){
	var out = {
		type: type,
		message: message,
		fromWho: fromWho
	}
	for (var i = sockets.length - 1; i >= 0; i--) {
		var socket = sockets[i];
		socket.sendUTF(JSON.stringify(out));
	}
}
function trimNull(what) {
	var index = what.indexOf('\0');
	if (index > -1) {
		return what.substr(0, index);
	}
	return what;
}
function removeNewLines(str){
	return str.replace(/(\r\n|\n|\r)/gm,'');
}

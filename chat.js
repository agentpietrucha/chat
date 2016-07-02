const connection = new WebSocket('ws://192.168.1.153:8081', 'chat-protocol');
var body = document.querySelector('body');
var textInput = document.querySelector('#textInput');
var messageButton = document.querySelector('#messageButton');
var textArea = document.querySelector('.textArea');
var nickButton = document.querySelector('#nickButton');
var nicknameInput = document.querySelector('#nicknameInput');
var name = '';
var activeUsers = document.querySelector('.activeUsers');
var user = document.querySelector('.user');
var chattingUsers = document.querySelector('.chattingUsers');

function updateScroll(){
	textArea.scrollTop = textArea.scrollHeight;
}
function sendNick() {
	name = nicknameInput.value;
	sendJSON('chat', 'nickname', name);
	console.log('NAME' + nicknameInput.value);
	nicknameInput.value = '';
	nicknameInput.placeholder = 'Hi, ' + name;
}
function sendMessage(){
	sendJSON('chat', 'message', recipient, textInput.value);
	createAndInsertElement('p', 'right', textInput.value, textArea);
	textArea.scrollTop = textArea.scrollHeight;
	nameMessageMapping.add(textInput.value, recipient, 'outcoming');
	textInput.value = '';
}

var recipients = [];
var costam = true;
chattingUsers.addEventListener('click', function(e){
	if(e.target.tagName !== 'P') {return;}
	recipient = e.target.innerText;
	sendJSON('chat', 'toWho', recipient, null);
	user.innerHTML = recipient;
	clearTextArea.clearAndPaste(recipient);
});
activeUsers.addEventListener('click', function(e){
	if (e.target.tagName !== 'LI') {return;}
	if (e.target.innerText === name) {return;}
	recipient = e.target.innerText;
	sendJSON('chat', 'toWho', recipient, null);
	user.innerHTML = recipient;
	addRecipient(recipient);
	if(nameMessageMapping.get(recipient) === undefined){
		clearTextArea.clear();
	} else{
		clearTextArea.clearAndPaste(recipient);
	}
	document.querySelector('.inputContainer').style.display = 'inline-block';
});
nickButton.addEventListener('click', function(){
	sendNick();
});
nicknameInput.addEventListener('keydown', function(e){
	if(e.keyCode !== 13) { return; }
	sendNick();
});
messageButton.addEventListener('click', function(){
	sendMessage();
});
textInput.addEventListener('keydown', function(e){
	if(e.keyCode !== 13) { return; }
	sendMessage();
});

connection.onmessage = function(e){
	updateScroll();
	console.log("DATA FROM WebSocket", e.data)
	var data = JSON.parse(e.data);
	if(data.type === 'connection'){
		console.log('CONNECTED');
	}
	if(data.type === 'activeUsersList'){
		while(activeUsers.firstChild){
			activeUsers.removeChild(activeUsers.firstChild);
		}
		console.log("activeUsers", data.message);
		for(var i = 0; i < data.message.length; i++){
			createAndInsertElement('li', null, data.message[i], activeUsers);
		}
	}
	if(data.type === 'userError'){
		createAndInsertElement('h1', null, data.message, body);
	}
	if(data.type === 'message'){
		updateScroll();
		recipient = data.fromWho;
		nameMessageMapping.add(data.message, recipient, 'incoming');
		createAndInsertElement('p', 'left', data.message, textArea);
		console.log('Message from user: ' + data.message);
		sendJSON('chat', 'toWho', recipient, null);
		user.innerHTML = recipient;
		if(recipient !== user.innerHTML){
			clearTextArea.clear();
		} else{
			clearTextArea.clearAndPaste(recipient);
		}
		addRecipient(recipient);
	}
}

function addRecipient(recipient) {
	if (recipients.indexOf(recipient) === -1){
		recipients.push(recipient);
		createAndInsertElement('p', null, recipient, chattingUsers);
	}
}

connection.onerror = function(error){
	console.log('ERROR', error);
}
var mapping = {};
var nameMessageMapping = (function(){
	return{
		add: function(message, recipient, type){
			if (mapping[recipient] === undefined) {
				mapping[recipient] = [];
			}
			mapping[recipient].push({type: type, message: message})
			console.log('MAPPING', mapping);
		},
		get: function(name){
			return mapping[name];
		}
	}
}());
function createAndInsertElement(element, clss, message, where){
	var element = document.createElement(element);
	element.classList.add(clss);
	element.innerHTML = message;
	where.appendChild(element);
}
var clearTextArea = (function(){
	return{
		clear: function(){
			while(textArea.firstChild){
				textArea.removeChild(textArea.firstChild);
			}
		},
		clearAndPaste: function(recipient){
			clearTextArea.clear();
			var x = nameMessageMapping.get(recipient);
			for(var i = 0; i < x.length; i++){
				if(x[i].type === 'incoming'){
					console.log('INCOMING', x[i].message);
					createAndInsertElement('p', 'left', x[i].message, textArea);
				} else if(x[i].type === 'outcoming'){
					console.log('OUTCOMING', x[i].message);
					createAndInsertElement('p', 'right', x[i].message, textArea);
				}
			}
			updateScroll();
		}
	}
}());
function sendJSON(request, type, name, message){
	var out = {
		request: request,
		type: type,
		name: name,
		message: message
	}
	connection.send(JSON.stringify(out));
}

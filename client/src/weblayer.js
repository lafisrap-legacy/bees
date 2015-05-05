// WebLayer Constants
//
// _B_SERVER_ADDRESS: websocket address of bee server
// _B_RECONNECT_TIME: Seconds after a reconnected is tried, if there is no connection 
//
var _B_SERVER_ADDRESS = "ws://192.168.178.41:4000/socket",
//var _B_SERVER_ADDRESS = "ws://localhost:4000/socket",
	_B_RECONNECT_TIME = 10;

// WebLayer contains all websocket related functionality 
//
// Methods
// -------
// whenReady calls a function if server connection is available and stores the function if not
// login is retrieving a sid from the server
// registerVariation activates the current variation on the bees server
// saveState saves the current state to local storage and database
// onOpen calls the login function after websocket connection is established
// onMessage brokers all reply and status messages from the server
// onError handles websocket error messages
// onClose tries to reconnect to the server after connection is lost
//
// Properties
// ----------
// ws contains a pointer to the websocket connection
// sid contains the current session id
// sidCbs contains all functions that are delayed because of missing connection
// playerId contains the playerId, mainly for login
// playerName contains the name of the Player. It is not stored in the server database
var WebLayer = cc.Class.extend({
	ws: null,
	sid: null,
	sidCbs: [],
	playerId: null,
	playerName: null,
	
	_playerlistCb: null,
	_connectPlayerCb: null,
	_updateGameCb: null,
	_messageCbs: [],
	_messageStorage: [],
	
    ctor:function () {
    	var self = this;

		try {
			this.ws = new WebSocket(_B_SERVER_ADDRESS);
		} catch(e) {
			cc.log("WebSocket connection to \""+_B_SERVER_ADDRESS+"\" failed.");
			return false;
		}

		this.ws.onopen = function(evt) { self.onOpen(evt) };
		this.ws.onmessage = function(evt) { self.onMessage(evt); };
		this.ws.onerror = function(evt) { self.onError(evt); };
		this.ws.onclose = function(evt) { self.onClose(evt); };        
		
		return true;
    },
    
    // whenReady
    //
    // Parameter
	//
    // command is the function that should be called if server is ready
    whenReady: function(command) {
    	if( this.sid != null ) {
    		command();
    	} else {
    		this.sidCbs.push(command);
    	}
    },

    login: function() {
    	if( this.sid === null ) {

			this.playerId = cc.sys.localStorage.getItem('playerId');
			this.playerName = cc.sys.localStorage.getItem('playerName');
		
			if( !this.playerName ) {
				n = cc.loader.getRes(res.names_json);
				this.playerName = n[Math.trunc(Math.random()*n.length)].name;
				cc.sys.localStorage.setItem('playerName',this.playerName);
			}

			if( this.playerId ) {
				this.ws.send('{"command":"login", "playerId":"'+this.playerId+'", "playerName":"'+this.playerName+'"}');
				// the server reply is collected in OnMessage / case: "login"
			} else {
				// if it is a browser, ask for magic spell, signup with this
					// if there is no bee server reachable, game cannot start
				this.ws.send('{"command":"signup"}');
				// the server reply is collected in OnMessage / case: "signup"
			}
		} else {
			cc.log("Didn't login. You are already logged in.");
		}
    },
    
    registerVariation: function( variation ) {
    	var self = this;
    	self.whenReady(function() {
 		   	cc.log("registerVariation: My sid is "+self.sid);
	    	self.ws.send('{"command":"registerVariation", "sid":"'+self.sid+'", "variation":"'+variation+'"}');		
	    });
    },
    
	sendCommand: function(command) {
    	var self = this;
		
    	self.whenReady(function() {
			command["sid"] = self.sid
 		   	cc.log("Sending "+JSON.stringify(command));
	    	self.ws.send(JSON.stringify(command));		
	    });
	},
   
	acceptInvitations: function(cb) {
		var self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"acceptInvitations", "sid":"'+self.sid+'"}');		
			self._playerlistCb = cb;

			cc.assert(typeof cb === "function", "acceptInvitations: Callback must be a function.")
	    });
	},
	
	invitePlayer: function(invitee, connectPlayerCb, updateGameCb) {
		var self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"invite", "sid":"'+self.sid+'", "invitee":"'+invitee+'"}');
	    	self._connectPlayerCb = connectPlayerCb;
	    	self._updateGameCb = updateGameCb;
	    });
	},
 
	disinvitePlayer: function(invitee) {
		var self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"disinvite", "sid":"'+self.sid+'", "invitee":"'+invitee+'"}');		
	    });
	},
	
	sendUpdate: function(data) {
		var self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"updateGame", "sid":"'+self.sid+'", "data":"'+JSON.stringifyWithEscapes(data)+'"}');		
	    });		
	},
 
	sendMessage: function(data) {
		var self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"sendMessage", "sid":"'+self.sid+'", "data":"'+JSON.stringifyWithEscapes(data)+'"}');		
	    });
	},

	receiveMessage: function(message, cb) {
		var self = this,
			ms = self._messageStorage,
			found = false;

		for( var i=0 ; i<ms.length ; i++ ) {
			if( ms[i].message === message ) {
				found = true;
				break;
			}
		}

		if( found ) {
			var msg = self._messageStorage.splice(i,1)[0];
			cb(msg);
		} else {
			self._messageCbs.push({ message: message, cb: cb});
		}
	},
 
    saveState: function(state) {
    	self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"saveState", "sid":"'+self.sid+'", "gameState":"'+JSON.stringifyWithEscapes(state)+'"}');		
    	});
	},
    	    
    onOpen: function(evt) {
    	this.login();
    },

	onMessage : function(evt) {
		var self = this;
		try {
			var data = JSON.parse(evt.data);
		} catch (e) {
			throw "load json [" + url + "] failed : " + e;
		}

		cc.log("Received JSON: " + JSON.stringify(data));

		ret = data.data.length && data.data[0] || {};
		if( ret.error ) {
			cc.log("onMessage, Error from Bees server: "+ret.error);
			return
		}
		switch( data.command ) {
		case "login":
			this.sid = ret.sid;
			cc.log("Login: Setting sid to "+this.sid);
			cc.assert(this.sid != null && typeof this.sid === "string","onmessage 'login': Received bad sid.");

			// We are logged in, so we call the waiting commands
			for( var i=0 ; i<this.sidCbs.length ; i++ ) {
				cc.log("Login: Calling waiting message functions."+this.sid);
				cc.assert(typeof this.sidCbs[i] === "function", "onmessage 'login': Bad sid callback.");
				this.sidCbs[i]();
			}
			this.sidCbs = [];
			break;
		case "signup":
			BeesPlayerId = data.data[0].playerId;
			cc.assert(BeesPlayerId != null && typeof BeesPlayerId === "string","onmessage 'signup': Received bad playerId.");
			// todo: only store playerId on a smartphone or an own computer
			cc.sys.localStorage.setItem('playerId',BeesPlayerId);

			this.login();
			break;
			
		// Notifications:
		case "playerlist":
			cc.assert(self._playerlistCb != null, "No callback available for notification from server.");

			self._playerlistCb(data.data);
			break;
		case "connectPlayer":
			cc.assert(self._connectPlayerCb != null, "No callback available for notification from server.");

			self._connectPlayerCb(data.data[0]); // for now only one player can be connected
			break;
		case "gameUpdate":	
			cc.assert(self._connectPlayerCb != null, "No callback available for notification from server.");

			self._updateGameCb(data.data);
			break;			
		case "message":	
			try {
				var data = JSON.parse(data.data[0].data),
					mcb = self._messageCbs,
					found = false;

				for( var i=0 ; i<mcb.length ; i++ ) {
					if( mcb[i].message === data.message ) {
						found = true;
						break;
					}
				}
				if( found ) {
					mcb[i].cb(data);
					self._messageCbs.splice(i,1);
				} else {
					self._messageStorage.push(data);
				}
			} catch(e) {
				cc.log("Couldn't parse JSON data: "+e.message);
			}
			break;			
		default:
			if( data.data[0] && data.data[0].error ) {
				cc.log("onmessage, unknown command: "+data.command);
			}
		}		
	},

	onError : function(evt) {
		cc.log("onError: "+evt);
	},

	onClose : function(evt) {
			var self = this;
			cc.log("Closing WebSocket connection");

			self.sid = null;
			
			// and try to open it again
			setTimeout(function() {
				if( !self.sid ) self.ctor();
			}, _B_RECONNECT_TIME*1000 );
	}
});

// ADDED METHODS
//
// JSON.stringifyWithEscapes escapes all quotation marks in a JSON string
//
JSON.stringifyWithEscapes = function(obj) {
	return JSON.stringify(obj).replace(/\"/g,"\\\"");
} 


var BEES_SERVER_ADDRESS = "ws://192.168.1.4:4000/socket",
	BEES_RECONNECT_TIME = 10;
	
JSON.stringifyWithEscapes = function(obj) {
	return JSON.stringify(obj).replace(/\"/g,"\\\"");
} 

var WebLayer = cc.Layer.extend({
	ws: null,
	sid: null,
	sidCbs: [],
	scene: null,
	
    ctor:function (scene) {
        this._super();

		this.scene = scene;

		this.initWebsocket();             	
        return true;
    },
    
    initWebsocket: function() {
    	var self = this;

		this.ws = new WebSocket(BEES_SERVER_ADDRESS);

		this.ws.onopen = function(evt) { self.onOpen(evt) };
		this.ws.onmessage = function(evt) { self.onMessage(evt); };
		this.ws.onerror = function(evt) { self.onError(evt); };
		this.ws.onclose = function(evt) { self.onClose(evt); };        
    },
    
    whenReady: function(cb) {
    	if( this.sid != null ) {
    		cb();
    	} else {
    		this.sidCbs.push(cb);
    	}
    },

    // call this function if you have no sid
    login: function() {
    	var playerId = localStorage.getItem('playerId');

	    if( playerId ) {
	    	this.sid = null;
		    this.ws.send('{"command":"login", "playerId":"'+playerId+'"}');
		} else {
			// if it is a browser, ask for magic spell, signup with this
				// if there is no bee server reachable, game cannot start
		    this.ws.send('{"command":"signup"}');
		}
    },
    
    saveState: function() {
    	self = this;
    	self.whenReady(function() {
	    	self.ws.send('{"command":"saveState", "sid":"'+self.sid+'", "gameState":"'+JSON.stringifyWithEscapes(self.scene.GameState())+'"}');		
    	});
	},
    	    
    onOpen: function(evt) {
    	this.login();
    },

	onMessage : function(evt) {
		
		try {
			var data = JSON.parse(evt.data);
		} catch (e) {
			throw "load json [" + url + "] failed : " + e;
		}

		cc.log("Received JSON: " + JSON.stringify(data));

		switch( data.command ) {
		case "login":
			this.sid = data.data[0].sid;
			cc.assert(this.sid != null && typeof this.sid === "string","onmessage 'login': Received bad sid.");

			// We are logged in, so we call the waiting callbacks
			for( var i=0 ; i<this.sidCbs.length ; i++ ) {
				cc.assert(typeof this.sidCbs[i] === "function", "onmessage 'login': Bad sid callback.");
				this.sidCbs[i]();
			}
			this.sidCbs = [];
			break;
		case "signup":
			BeesPlayerId = data.data[0].playerId;
			cc.assert(BeesPlayerId != null && typeof BeesPlayerId === "string","onmessage 'signup': Received bad playerId.");
			// todo: only store playerId it on a smartphone or an own computer
			localStorage.setItem('playerId',BeesPlayerId);

			this.login();
			break;
		default:
			if( data.data[0].error ) {
				cc.log("onmessage, Error from Bees server: "+data.data[0].error);
			}
		}		
	},

	onError : function(evt) {
			cc.log("Error accessing WebSocket to "+evt.currentTarget.url);
	},

	onClose : function(evt) {
			var self = this;
			cc.log("Closing WebSocket connection to "+evt.currentTarget.url);
			self.sid = null;
			
			// and try to open it again
			setTimeout(function() {
				self.initWebsocket();
			}, BEES_RECONNECT_TIME*1000 );
	}
});



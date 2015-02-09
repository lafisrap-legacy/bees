var BEES_SERVER_ADDRESS = "ws://192.168.1.4:4000/socket",
	BEES_RECONNECT_TIME = 10;

var WebLayer = cc.Layer.extend({
	ws: null,
	
    ctor:function () {
        this._super();

		this.initWebsocket();             	
        return true;
    },
    
    initWebsocket: function() {
    	var self = this;

		this.ws = new WebSocket(BEES_SERVER_ADDRESS);

		this.ws.onopen = function(evt) { self.onopen(evt) };
		this.ws.onmessage = function(evt) { self.onmessage(evt); };
		this.ws.onerror = function(evt) { self.onerror(evt); };
		this.ws.onclose = function(evt) { self.onclose(evt); };        
    },
    
    onopen: function(evt) {
	    //ws.send('{"command":"signup"}');
		cc.log("Open!");
	    this.ws.send('{"command":"login", "playerId":"7b8b5b7bd88afb88d9bbf90dffd456fd3570ce36"}');
    },

	onmessage : function(evt) {
		
//		var data = evt.data.replace(/\\\"/g,"\"");
//		data = data.replace(/\"\{/g,"{");
//		data = data.replace(/\}\"/g,"}");
//		cc.log("New string: "+data);
		
		try {
			var data = JSON.parse(evt.data);
		} catch (e) {
			throw "load json [" + url + "] failed : " + e;
		}

		cc.log("Received JSON: " + JSON.stringify(data));
		
		if( data.sid == "login" ) {
			var gameState = {
				currentGame: "stories"
			}



			cc.log("Sending Game state: " + JSON.stringify(gameState) + " and sid: "+data.data[0].sid);
		
			var json = '{"command":"saveState", "sid":"'+data.data[0].sid+'", "gameState":"{\\\"currentGame\\\":\\\"stories4\\\"}"}';
			//this.ws.send('{"command":"saveState", "sid":"'+data.data[0].sid+'", "gameState":'+JSON.stringify(gameState)+'}');		
			this.ws.send('{"command":"saveState", "sid":"'+data.data[0].sid+'", "gameState":"{\\\"currentGame\\\":\\\"stories4\\\"}"}');		
		}
		
		if( data.data[0].gamestate ) {
			var gamestate = JSON.parse(data.data[0].gamestate);
			cc.log("GAMESSTATE === %s ===",gamestate.currentGame);
		}
	},

	onerror : function(evt) {
			cc.log("Error accessing WebSocket to "+evt.currentTarget.url);
	},

	onclose : function(evt) {
			var self = this;
			cc.log("Closing WebSocket connection to "+evt.currentTarget.url);
			self.ws = null;
			
			// and try to open it again
			setTimeout(function() {
				self.initWebsocket();
			}, BEES_RECONNECT_TIME*1000 );
	}
});



var BeesPlayerId = "";

// TitleLayer is the entrance layer of the game. It serves the main menu.
//
// Methods
// -------
// initListener starts touch events of the title layer
// stopListener stops touch events 
//
// Properties
// ----------
// -none-
var TitleLayer = cc.Layer.extend({
    ctor:function () {
        this._super();
        
        var size = cc.winSize;

        var bs = new cc.Sprite(res.beehive_jpg);
        bs.attr({
            x: size.width / 2,
            y: size.height / 2,
            scale: 1,
            rotation: 0
        });
        this.addChild(bs, 0);

        bs.runAction(
            cc.spawn(
                cc.scaleTo(2.5, 1.12, 1.12),
                cc.moveBy(2.5, 50, 20)
            )
        );

        this.initListeners();

        return true;
    },
	
	initListeners: function() {
		var self = this;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {},
			onTouchesMoved: function(touches, event) {},
			onTouchesEnded: function(touches, event){

				var touch = touches[0],
					loc = touch.getLocation();	            		

				// ignore location, hide anyway
				self.stopListeners();

				$b.showMenu([{
					label: "Worte versenken",
					cb: function() { 
					    cc.LoaderScene.preload(_b_getResources("wordbattle","Das Eselein"), function () {
					        cc.director.runScene(new WordBattleScene("Das Eselein"));
    					}, this);
					}
				},{
					label: "Zweiter Eintrag",
					cb: function() { cc.log("Zweiter Eintrag gewählt!")}
				},{
					label: "Dritter Eintrag",
					cb: function() { cc.log("Dritter Eintrag gewählt!")}
				},{
					label: "Vierter Eintrag",
					cb: function() { cc.log("Vierter Eintrag gewählt!")}
				},{
					label: "Fünfter Eintrag",
					cb: function() { cc.log("Fünfter Eintrag gewählt!")}
				},{
					label: "Sechster Eintrag",
					cb: function() { cc.log("Sechster Eintrag gewählt!")}
				}], function() {
					self.initListeners();
				});
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
	
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    },
});

// BeeScene is the main scene. It's instance is contained in $b
//
// Methods
// -------
// showMenu displays the menu with custom entries and callbacks
// getState retrieves the object of the current state, so props can be read or modified
// saveState saves the current state to local storage and database (S)
// registerVariation activates the current variation on the bees server (S)
//
// Properties
// ----------
// weblayer contains a pointer to all websocket related functionality
// menuLayer contains a pointer to the menu functionality
// gameState contains the current game state, everything you need to restore it
//
var BeesScene = cc.Scene.extend({
	weblayer: null,
	menuLayer: null,
	selectPlayerLayer: null,
	selectPlayerLayer: null,
	gameState: {},
	size: null,
	
    onEnter:function () {
        this._super();
        
        cc.log("Starting main scene ...");
        this.weblayer = new WebLayer();
        var title = new TitleLayer();
        this.addChild(title);
        this.menuLayer = new MenuLayer();
        _b_retain(this.menuLayer,"BeesScene, menuLayer");
        
        cc.width = cc.winSize.width;
        cc.height = cc.winSize.height;	
        
        cc.LoaderScene.preload(_b_getResources("wordbattle","Das Eselein"), function () {
			cc.director.runScene(new WordBattleScene("Das Eselein"));
		}, this);
    },
    
    onExit: function() {
        this._super();

    	_b_release(this.menuLayer);
    },
    
    // showMenu parameter
    //
    // labelsAndCallbacks: 	see MenuLayer.show
 	// fcb: 				see MenuLayer.show
 	//
    showMenu: function(labelsAndCallbacks,fcb) {
		this.addChild(this.menuLayer);
		this.menuLayer.show(labelsAndCallbacks,fcb);
    },

    // Common Bees Game Interface
    //
    /////// General
 	// sendCommand
 	// getState
 	// saveState 
 	//
 	/////// before the game
 	// registerVariation
    // connectPlayer
    //
    /////// in the game
 	// sendUpdate
 	// sendMessage
 	// receiveMessage
 	//
    /////// internally used
 	// acceptInvitations 
 	// invitePlayer
 	// disinvitePlayer
 	//    
    connectPlayer: function(connectCb, updateCb, baseLayer) {
    	var layer = new SelectPlayerLayer();
		layer.show([], function(player) { connectCb(player); }, updateCb);		
        (baseLayer || this).addChild(layer,5);
    },
    
    getState: 			function() 			 	  { return this.gameState; },
    saveState: 			function() 			 	  { return this.weblayer.saveState(this.gameState); },
    sendCommand:		function(command)	 	  { return this.weblayer.sendCommand(command); },
    registerVariation: 	function(variation)  	  { return this.weblayer.registerVariation(variation); },
    acceptInvitations: 	function(cb) 		 	  { return this.weblayer.acceptInvitations(cb); },
    invitePlayer:		function(invitee,cb1,cb2) { return this.weblayer.invitePlayer(invitee, cb1, cb2); },
    sendUpdate:			function(data) 			  { return this.weblayer.sendUpdate(data); },    
    sendMessage:		function(data) 			  { return this.weblayer.sendMessage(data); },    
    receiveMessage:		function(message,cb) 	  { return this.weblayer.receiveMessage(message,cb); },    
    stopMessage:		function(message) 	  	  { return this.weblayer.stopMessage(message); },    
    disinvitePlayer:	function(invitee)	 	  { return this.weblayer.disinvitePlayer(invitee); },
});

// GLOBAL VARIABLES
//
// _b_retained contains all currently retained cocos2d objects. They all have to be released after usage

var _b_retained = []

// GLOBAL FUNCTIONS
//
// _b_retain registers a cocos2d object as retains (saves it from being garbage collected)
// _b_release unregisters a cocos2d object
// _b_getRessources prepares all resources of a variation to be preloaded

var _b_retain = function(obj,name) {
	obj.retain();
	
	obj.__retainId = _b_getId();
	
    _b_retained[obj.__retainId] = name;
	//cc.log("Retaining "+obj.__retainId+": '"+_b_retained[obj.__retainId]+"'");
}

var _b_release = function(obj) {

	cc.assert(obj && _b_retained[obj.__retainId], "_b_release: Object '"+obj.__retainId+"' not valid or not in retained array...");
	obj.release();		
	//cc.log("Releasing "+obj.__retainId+": '"+_b_retained[obj.__retainId]+"'");

	delete _b_retained[obj.__retainId];
}

var _b_getResources = function(game, variation) {

	var g_resources = [], vars = ["All",variation];
	for(var v in vars) { 
		for(var r in gameRes[game][vars[v]]) {
			g_resources.push(gameRes[game][vars[v]][r]);
		}
	}
	return g_resources;
}

var _b_IdFactory = function() {
	var id = 1000;

	return function() {
		return ++id;
	}
}
var _b_getId = _b_IdFactory();

var _b_getFontName = function(resource) {
    if (cc.sys.isNative) {
        return resource.srcs[0];
    } else {
        return resource.name;
    }
}

var _b_recall = function() {
	try {
		var textMemory = JSON.parse(cc.sys.localStorage.getItem('textMemory') || []);
	} catch(e) {
		var textMemory = [];
	}

	return function(text) {
		if( textMemory.indexOf(text) >= 0 ) return true;
		
		textMemory.push(text);
		cc.sys.localStorage.setItem('textMemory', JSON.stringify(textMemory));
		return false;
	}
}
var _b_remember = _b_recall();

var _b_in_seconds = /^in_([\d\.]+)_seconds$/,
	_b_waitingEvents = null;

var _b_one = function(events, cb) {
	_b_on(events, cb, true);
};

var _b_on = function(events, cb, justOne) {
	if( typeof events === "string" ) events = [events];
	cc.assert(typeof events === "object", "I need an array of event string or a single event string.");
	
	for( var i=0, listeners=[] ; i<events.length ; i++ ) {
		var event = events[i],
			res = _b_in_seconds.exec(event);

		var seconds;
		if( seconds = parseFloat(event)) {
			var e = event;

			setTimeout(function() {
				cc.eventManager.dispatchCustomEvent(e, seconds);
			}, seconds * 1000);		
		} else if( res ) {
			seconds = parseFloat(res[1]),
				e = event;

			setTimeout(function() {
				cc.eventManager.dispatchCustomEvent(e, seconds);
			}, seconds * 1000);		
		}
		
		
		listeners.push(cc.eventManager.addCustomListener(event, function(event) {
			if( justOne ) for( var i=0 ; i<listeners.length ; i++ ) cc.eventManager.removeListener(listeners[i]);
			if( _b_waitingEvents ) {
				_b_waitingEvents.push({
					func: cb,
					event: event
				});
			} else {
			    cb(event);
			}
		}));
	}
	
	return listeners;
};

var _b_off = function(listeners) {
	cc.assert(typeof listeners === "array", "I need an array of cc.EventListener objects.");
	
	for( var i=0 ; i<listeners.length ; i++ ) cc.eventManager.removeListener(listeners[i]);
};

var _b_clear = function(events) {
	if( typeof events === "string" ) events = [events];

	for( var i=0 ; i<events.length ; i++ ) cc.eventManager.removeCustomListeners(events[i]);
};

var _b_pause = function() {
	_b_waitingEvents = [];
};

var _b_resume = function() {
	var we = _b_waitingEvents;

	if( !we ) return;

	for( var i=0 ; i<we.length ; i++ ) {
		we[i].func(we[i].event);
	}
	_b_waitingEvents = null;
}	

// audio enhancements
var _b_audio = function() {

	var musicToPlay = [],
		musicTimeout = null,
		fadeTime = 0,
		fadePerSec = 0;
	
	cc.audioEngine.step = function(dt) {
		if( fadeTime ) {
			var volume = cc.audioEngine.getMusicVolume() + fadePerSec*dt;
			cc.audioEngine.setMusicVolume(volume);

			fadeTime -= dt;
			if( fadeTime < 0 ) fadeTime = 0;
		}
	};

	cc.audioEngine.fadeTo = function(time, targetVolume, cb) {
		var currentVolume = cc.audioEngine.getMusicVolume(),
			diff = targetVolume - currentVolume;

		fadeTime = time;
		fadePerSec = diff / time;
	};

	cc.audioEngine.fadeOut = function(time, cb) {
		this.fadeTo(time,0,cb);
	};

	cc.audioEngine.fadeIn = function(time, cb) {
		this.fadeTo(time,1,cb);
	};

	cc.audioEngine.addMusic = function(url, loop) {
		
		cc.assert(url, "I need a url for playing music.");
			
		var name = url.substr(url.lastIndexOf("/")+1),
			time = sRes[name] && Math.round(sRes[name]*1000);

		cc.assert(time, "Couldn't retrieve duration of mp3 file "+name);

		var next = function() {
			if( musicToPlay.length > 0 ) {
				var music = musicToPlay.splice(0,1)[0];
				cc.audioEngine.playMusic(music.url, music.loop);
				musicTimeout = setTimeout(next, music.time);
			} else {
				musicTimeout = null;
			}
		};

		if( !musicTimeout ) {
			cc.audioEngine.playMusic(url, loop);
			musicTimeout = setTimeout(next, time);
		} else {
			musicToPlay.push({
				url: url,
				loop: loop,
				time: time
			});
		}
	};

	cc.audioEngine.stopAllMusic = function() {
		cc.audioEngine.stopMusic();
		musicToPlay = [];
		if( musicTimeout ) {
			clearTimeout(musicTimeout);
			musicTimeout = null;
		}
	};
};
_b_audio();





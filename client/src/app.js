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
	gameState: {},
	size: null,
	
    onEnter:function () {
        this._super();
        
        this.weblayer = new WebLayer();
        var title = new TitleLayer();
        this.addChild(title);
        this.menuLayer = new MenuLayer();
        _b_retain(this.menuLayer,"BeesScene, menuLayer");
        
        cc.width = cc.winSize.width;
        cc.height = cc.winSize.height;
    },
    
    onExit: function() {
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
    
    connectPlayer: function(cb, baseLayer) {
    	
		var self = this;
    	
    	if( this.selectPlayerLayer ) {
    		this.removeChild(this.selectPlayerLayer);
			_b_release(this.selectPlayerLayer);
		}

		this.selectPlayerLayer = new SelectPlayerLayer(function(player) {
			_b_release(self.selectPlayerLayer);
			cb();
		}, []);		
		
        (baseLayer || this).addChild(this.selectPlayerLayer,5);
		_b_retain(this.selectPlayerLayer,"BeeScene, connectPlayer")
    },
    
    getState: 			function() 			{ return this.gameState; },
    saveState: 			function() 			{ return this.weblayer.saveState(this.gameState); },
    registerVariation: 	function(variation) { return this.weblayer.registerVariation(variation); },
    acceptInvitations: 	function(cb) 		{ return this.weblayer.acceptInvitations(cb); },
    sendCommand:		function(command)	{ return this.weblayer.sendCommand(command); }
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
    _b_retained[obj.__instanceId] = name;
}

var _b_release = function(obj) {

	cc.assert(obj && _b_retained[obj.__instanceId], "_b_release: Object not valid or not in retained array.");
	obj.release();		
	delete _b_retained[obj.__instanceId];
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




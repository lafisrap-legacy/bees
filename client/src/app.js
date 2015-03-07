var BeesPlayerId = "";

var TitleLayer = cc.Layer.extend({
    sprite:null,
    ctor:function () {
        this._super();
        
        var size = cc.winSize;

        var helloLabel = new cc.LabelTTF("Willkommen auf Yayla's Wiese", "Arial", 38);
        // position the label on the center of the screen
        helloLabel.x = size.width / 2;
        helloLabel.y = 0;
        // add the label as a child to this layer
        this.addChild(helloLabel, 5);

        this.sprite = new cc.Sprite(res.beehive_jpg);
        this.sprite.attr({
            x: size.width / 2,
            y: size.height / 2,
            scale: 1,
            rotation: 0
        });
        this.addChild(this.sprite, 0);

        this.sprite.runAction(
            cc.spawn(
                cc.scaleTo(2.5, 1.12, 1.12),
                cc.moveBy(2.5, 50, 20)
            )
        );
        helloLabel.runAction(
            cc.spawn(
                cc.moveBy(2.5, cc.p(0, size.height - 40)),
                cc.tintTo(2.5,255,0,0)
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
				self.getParent().showMenu([{
					label: "Worte versenken",
					cb: function() { 
					    cc.LoaderScene.preload(_b_getResources("wordbattle","Das Eselein"), function () {
					        cc.director.runScene(new WordBattleScene(self.getParent(),"Das Eselein"));
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

var BeesScene = cc.Scene.extend({
	weblayer: null,
	menuLayer: null,
	gameState: {},
    onEnter:function () {
        this._super();
        this.weblayer = new WebLayer(this);
        var title = new TitleLayer();
        this.addChild(title);
        this.menuLayer = new MenuLayer();
        _b_retain(this.menuLayer,"BeesScene, menuLayer");
    },
    
    onExit: function() {
    	_b_release(this.menuLayer);
    },
    
    showMenu: function(labelsAndCallbacks,fcb) {
		this.addChild(this.menuLayer);
		this.menuLayer.show(labelsAndCallbacks,fcb);
    },
    
    getState: function() 	{ return this.gameState; },
    saveState: function() 	{ return this.weblayer.saveState(this.gameState); }
});

var retained = []
var _b_retain = function(obj,name) {
	obj.retain();
    retained[obj.__instanceId] = name;
}

var _b_release = function(obj) {

	cc.assert(obj && retained[obj.__instanceId], "_b_release: Object not valid or not in retained array.");
	obj.release();		
	delete retained[obj.__instanceId];
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




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
                cc.moveBy(2.5, 20, 20)
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
					label: "Erster Eintrag",
					cb: function() { cc.log("Erster Eintrag gewählt!")}
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
        this.GameState().currentGame = "Geschichten";
        this.weblayer.saveState();        
    },
    showMenu: function(labelsAndCallbacks,fcb) {
		this.addChild(this.menuLayer);
		this.menuLayer.show(labelsAndCallbacks,fcb);
    },
    GameState: function() { return this.gameState; }
});


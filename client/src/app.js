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
                cc.scaleTo(2.5, 1.03, 1.03),
                cc.moveBy(2.5, 20, 20)
            )
        );
        helloLabel.runAction(
            cc.spawn(
                cc.moveBy(2.5, cc.p(0, size.height - 40)),
                cc.tintTo(2.5,255,0,0)
            )
        );
        return true;
    }
});

var BeesScene = cc.Scene.extend({
	weblayer: null,
	gameState: {},
    onEnter:function () {
        this._super();
        this.weblayer = new WebLayer(this);
        var title = new TitleLayer();
        this.addChild(title);
        var menu = new MenuLayer();
        this.addChild(menu,5);
        this.GameState().currentGame = "Geschichten";
        this.weblayer.saveState();
        
        menu.show([{
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
        }]);
    },
    GameState: function() { return this.gameState; }
});

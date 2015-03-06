
var WordBattleLayer = cc.Layer.extend({
    sprite:null,
    ctor:function () {
        //////////////////////////////
        // 1. super init first
        this._super();

        return true;
    }
});

var WordBattleScene = cc.Scene.extend({
	main: null,
	gameState: null,
	game: "wordbattle",
	variation: null,
	ctor: function(mainScene, variation) {
    	this.main = mainScene;
    	this.main.getState().currentGame = game;
    	this.main.getState().currentVariation = variation;
    	this.variation = variation;
        this.main.weblayer.registerVariation(this.game+"/"+variation);   

		this.main.saveState(); 
	},
    onEnter:function () {
        this._super();

        var layer = new WordBattleLayer();
        this.addChild(layer);
    }
});


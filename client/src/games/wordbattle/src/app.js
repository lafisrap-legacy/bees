
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
        this._super();

    	this.main = mainScene;
    	this.variation = variation;

    	this.main.getState().currentGame 	  = this.game;
    	this.main.getState().currentVariation = this.variation;
        this.main.weblayer.registerVariation(this.game+"/"+this.variation);   

		this.main.saveState(); 
	},
    onEnter:function () {
        this._super();

        var layer = new WordBattleLayer();
        this.addChild(layer);
    }
});


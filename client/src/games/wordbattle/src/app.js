
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
	gameState: null,
	game: "wordbattle",
	variation: null,
	ctor: function(variation) {
        this._super();

    	this.variation = variation;

    	$b.getState().currentGame 	  = this.game;
    	$b.getState().currentVariation = this.variation;
        $b.registerVariation(this.game+"/"+this.variation);   

		$b.saveState(); 
	},
    onEnter:function () {
        this._super();

        this.addChild(new WordBattleLayer());
    }
});


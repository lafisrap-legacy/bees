
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
	weblayer: null,
	game: "wordbattle",
	variation: null,
	ctor: function(mainScene, variation) {
    	this.weblayer = mainScene.weblayer;
    	this.variation = variation;
        this.weblayer.registerVariation(this.game+"/"+variation);    
	},
    onEnter:function () {
        this._super();

        var layer = new WordBattleLayer();
        this.addChild(layer);
    }
});


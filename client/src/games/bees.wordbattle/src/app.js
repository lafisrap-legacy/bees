
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
    onEnter:function () {
        this._super();
    	this.weblayer = new WebLayer(this);

        var layer = new WordBattleLayer();
        this.addChild(layer);
    }
});


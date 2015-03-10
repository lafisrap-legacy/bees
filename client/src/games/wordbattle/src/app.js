
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

        $b.sendCommand({
        	command: "registerVariation",
        	variation: this.game+"/"+this.variation
        });   

        $b.sendCommand({
        	command: "acceptInvitations"
        });   

		setTimeout(function() {	
		    $b.sendCommand({
        		command: "stopInvitations"
        	});   
		},100000);

		$b.saveState(); 
	},
    onEnter:function () {
        this._super();

        this.addChild(new WordBattleLayer());
    }
});


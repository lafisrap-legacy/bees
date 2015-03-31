
var WordBattleLayer = cc.Layer.extend({
    sprite:null,
    ctor:function () {
        //////////////////////////////
        // 1. super init first
        this._super();
        
		$b.connectPlayer(function(player) {
			if( !player ) cc.director.runScene($b);

			cc.log("Player "+player.name+" connected (sid:"+player.sid+")!");
			cc.director.runScene($b);
		}, this);
		
        return true;
    },
    
    initListeners: function() {
		var self = this;
		var start = null;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {
				var touch = touches[0],
				start = touch.getLocation();	       		
			},
			onTouchesMoved: function(touches, event) {
				var touch = touches[0],
				loc = touch.getLocation();	            		

			},
			onTouchesEnded: function(touches, event){

				var touch = touches[0],
					loc = touch.getLocation();	
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
	
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    },
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

		$b.saveState(); 		
	},
    onEnter:function () {
        this._super();

        this.addChild(new WordBattleLayer());
    }
});


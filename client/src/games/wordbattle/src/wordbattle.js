var _B_MAX_SHIP_LENGTH = 14,
	_B_SHIP_TILE_SIZE = 112;

var WordBattleLayer = cc.Layer.extend({
	res: null,
	_seaLeft: null,
	_seaRight: null,
	
    ctor:function () {
        //////////////////////////////
        // 1. super init first
        this._super();
                
        // get the sprite sheet
    	cc.spriteFrameCache.addSpriteFrames(gRes.wordbattle_plist);	    
        
		$b.connectPlayer(function(player) {
			if( !player ) cc.director.runScene($b);

			cc.log("Player "+player.name+" connected (sid:"+player.sid+")!");
			
			if( player.first == "yes" ) $b.sendUpdate({"gameinfo":"all"});
		}, this.gameUpdate, this);

		var seaLeft = this._seaLeft = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,616,616));
		seaLeft.setPosition(cc.p(284,cc.height/2));
		seaLeft.setScale(0.1);
		seaLeft.runAction(
			cc.scaleTo(0.33,1)
		);
		var seaRight = this._seaRight = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,616,616));
		seaRight.setPosition(cc.p(852,cc.height/2));
		seaRight.setScale(0.1);
		seaRight.runAction(
			cc.scaleTo(0.33,1)
		);
		
		this.addChild(seaLeft,0);
		this.addChild(seaRight,0);

		text = ["Hello","World!","here","ist","battleship"];	
		for( var i=0 ; i<text.length ; i++ ) {
		
			ship = this.buildShip(text[i]);
		
			ship.node.setPosition(200+200*i,cc.height/2);
		
			this.addChild(ship.node,5);
		
			ship.node.runAction(
				cc.spawn(
					cc.scaleTo(1,0.5),
					cc.rotateBy(2,360)
				)
			);
		}				
        return true;
    },
    
    buildShip: function(word) {
		var wl = word.length;

    	if( wl < 3 || wl > _B_MAX_SHIP_LENGTH ) return null;
    	
		var ship = {
			word: word,
			node: cc.Node.create()
		}

		// create the sprites and add them to the node		
		ship.node.addChild(cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_front"),cc.rect(0,0,_B_SHIP_TILE_SIZE,_B_SHIP_TILE_SIZE)));
		for( var i=1 ; i<wl-1 ; i++ ) {
			ship.node.addChild(cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_middle"+(parseInt(Math.random()*3+1))),cc.rect(0,0,_B_SHIP_TILE_SIZE,_B_SHIP_TILE_SIZE)));
		}
		ship.node.addChild(cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_back"),cc.rect(0,0,_B_SHIP_TILE_SIZE,_B_SHIP_TILE_SIZE)));
		
		for( var i=0 ; i<wl ; i++ ) {
			ship.node.children[i].setPosition(cc.p(0, (wl/2-i)*_B_SHIP_TILE_SIZE - _B_SHIP_TILE_SIZE/2));
		}
		
		return ship;
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
    
    gameUpdate: function(data) {
    	
    	debugger;
    }
});

var WordBattleScene = cc.Scene.extend({
	gameState: null,
	game: "wordbattle",
	variation: null,
	ctor: function(variation) {
        this._super();

		cc.assert(gameRes[this.game][variation],"No resources for "+variation+" in resource object gameRes");
    	this.variation = variation;
    	
		gRes = gameRes[this.game]["All"];
		vRes = gameRes[this.game][variation];

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
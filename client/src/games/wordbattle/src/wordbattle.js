// WordBattleLayer Constants
//
var _B_MAX_SHIP_LENGTH = 10,	// maximum ship length (or size of the sea)
	_B_SHIP_TILE_SIZE = 112,	// Pixel size of a ship tile, on the ground half: 56
	_B_WORDS_PER_ROUND = 7,		// maximum number of words per round
	_B_UNKNOWN_WATER = 0,		// Undiscovered area with no ship
	_B_KNOWN_WATER = 1,			// Discovered area with no ship
	_B_UNKNOWN_SHIP = 2,		// Undiscovered area with ship
	_B_KNOWN_SHIP = 3;			// Discovered area with ship

// Regular Expressions
//
_b_plainWords = /\b[\wäöüÄÖÜß]{2,}/g;
_b_WordsWithPunctuation = /\s*„?\b[\wäöüÄÖÜß]{2,}[^\wäöüÄÖÜß\„]*/g;  // currently only German umlauts

// WordBattleLayer is the main layer for the word battle game
//
// Methods
// -------
// ctor 
// buildShip 
// destroyShip
// initListener starts touch events of the title layer
// stopListener stops touch events 
//
// Properties
// ----------
// _ownSea is an array containing the own ships and their status
// _otherSea is a array containing ships and status of the opponent
// _text is the full text of the fairytale
// _sphinx are the sphinx questions
// _pureWords is an array with all words of the current paragraph/episode without punctuation
// _fullWords is an array with all words of the current paragraph/episode with punctuation
// _rounds is an arrayarray containing the word ids for every round
// _round is the current round
//
var WordBattleLayer = cc.Layer.extend({
	_ownSea: [],
	_otherSea: [],
	_ownShips: [],
	_otherShips: [],
	_text: null,
	_sphinx: null,
	_pureWords: null,
	_fullWords: null,
	_rounds: null,
	_round: null,
	_first: null,
	
    ctor:function () {
    	var self = this;
    
        cc.log("Entering word battle layer ...");
        this._super();
        cc.log("Parents ok ...");

        //////////////////////////////
        // Get the sprite sheet
    	cc.spriteFrameCache.addSpriteFrames(gRes.wordbattle_plist);	    

        //////////////////////////////
        // Register computer player
        // todo ...
        
        //////////////////////////////
        // Connect other player
		$b.connectPlayer(function(player) {
			if( !player ) cc.director.runScene($b);

			cc.log("Player "+player.name+" connected (sid:"+player.sid+")!");
			
			self._first = player.first === "yes";			
			
			self.startGame();
		}, this.gameUpdate, this);

        cc.log("Creating seas ...");
        //////////////////////////////
        // Create and show seas
		var seaLeft = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,616,616));
		seaLeft.setPosition(cc.p(284,cc.height/2));
		seaLeft.setScale(0.1);
		seaLeft.runAction(
			cc.scaleTo(0.33,1)
		);
		var seaRight = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,616,616));
		seaRight.setPosition(cc.p(852,cc.height/2));
		seaRight.setScale(0.1);
		seaRight.runAction(
			cc.scaleTo(0.33,1)
		);
		this.addChild(seaLeft,0);
		this.addChild(seaRight,0);

		var json = cc.loader.getRes(vRes.Fairytale_json);
		if( !json ) {
			cc.log("ERROR: Can't open resource file for "+this.parent().game+"/"+this.parent().variation);
			cc.director.runScene($b);
		}

		this._text = json.text;
		this._sphinx = json.sphinx;

        return true;
    },
    
    // startGame starts the game, selecting the start paragraph, selecting a priority list from the collectors book, looking through suggestions of other player
    startGame: function(first) {
        //////////////////////////////
        // Look into the collectors book, which paragraphs are next, and prioritize them
        // to be done ...

        //////////////////////////////
        // Send the list to the opponent (first) or wait for his list and make a selection
        // to be done ...

    	// for now start with episode 1
    	this.startEpisode(0);
    },

	// startEpisode starts a play with one paragraph, creating a play list
	startEpisode: function(paragraph) {
		var self = this;
	
		p = this._text[paragraph];
		
        //////////////////////////////
        // Get the single words out of the current paragraph, with and without punctuation
		this._pureWords = p.match(_b_plainWords);
		this._fullWords = p.match(_b_WordsWithPunctuation);
		cc.assert(this._pureWords.length === this._fullWords.length, "Number of words doesn't match between _pureWords and _fullWords.");

        //////////////////////////////
        // Divide the words on different rounds and send it, or wait for the words from the other player
        if( this._first ) {
			var lotteryWheel = [],
				rounds = [],
				n = this._pureWords.length;
			
			for( var i=0 ; i<n ; i++ ) lotteryWheel.push(i);
			for( var i=0 ; i < Math.floor((n-1)/_B_WORDS_PER_ROUND+1) ; i++ ) rounds.push([]);
			for( var i=0 ; i<n ; i++ ) rounds[i%rounds.length].push(lotteryWheel.splice(parseInt(Math.random()*lotteryWheel.length),1)[0]);
			cc.assert(lotteryWheel.length == 0, "Lottery wheel is not empty.");
			
			this._rounds = rounds;
			this.startRound();

			$b.sendMessage(this._rounds);
		} else {
			$b.receiveMessage(function(data) {
				self._rounds = data;
				this.startRound();
			});
		}

        //////////////////////////////
        // Start the first round
		this._round = 0;
	},
	
	startRound: function() {
	
        //////////////////////////////
        // Clear own sea
		for( var i=0 ; i<_B_MAX_SHIP_LENGTH ; i++ ) {
			this._ownSea[i] = [];
			for( var j=0 ; j<_B_MAX_SHIP_LENGTH ; j++ ) {
				this._ownSea[i][j] = _B_UNKNOWN_WATER;
			}
		}

        //////////////////////////////
        // Build ships
		var r = this._rounds[this._round];  
		for( var i=0 ; i<r.length ; i++ ) {
		
			var ship = this._ownShips[i] = this.buildShip(this._pureWords[r[i]]);

			// Ships are sprite classes! ...

			ship.pos = this.findPosition(i, {row:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH),col:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH),dir:Math.floor(Math.random()*4)*90});
			// draw sprite 
			ship.node.setPosition(ship.pos);
		
			this.addChild(ship.node,5);
			_b_retain(ship.node,"SelectPlayerLayer, show, ship"+i);
		
			ship.node.runAction(
				cc.spawn(
					cc.scaleTo(1,0.5)
				)
			);
		}		


		
	},

    // buildShip creates a ship in a certain length
	//
	// Parameter
	// ---------
	// word is the word associated with the ship
	//
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
    
    destroyShip: function(ship) {
		_b_release(ship.node);
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
    	
        cc.log("Initializing word battle scene ...");
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
    onEnter: function () {
        this._super();

        cc.log("Adding word battle layer ...");
        this.addChild(new WordBattleLayer());
    },
    
    onExit: function() {
        this._super();
    }
});
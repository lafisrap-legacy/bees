// WordBattleLayer Constants
//
var _B_MAX_SHIP_LENGTH = 10,	// maximum ship length (or size of the sea)
	_B_SQUARE_SIZE = 56,
	_B_WORDS_PER_ROUND = 7,		// maximum number of words per round

// Regular Expressions
//
_b_plainWords = /\b[\wäöüÄÖÜß]{2,}/g;
_b_WordsWithPunctuation = /\s*„?\b[\wäöüÄÖÜß]{2,}[^\wäöüÄÖÜß\„]*/g;  // currently only German umlauts

// WordBattleLayer is the main layer for the word battle game
//
// Methods
// -------
// ctor 
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

        //////////////////////////////
        // Create and show seas
		var s1 = this._ownSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,560,560));
		s1.setPosition(cc.p(284,cc.height/2));
		s1.setScale(0.1);
		s1.runAction(
			cc.scaleTo(0.90,1)
		);
		var s2 = this._otherSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,560,560));
		s2.setPosition(cc.p(852,cc.height/2));
		s2.setScale(0.1);
		s2.runAction(
			cc.scaleTo(1,1)
		);
		this.addChild(s1,0);
		this.addChild(s2,0);

        //////////////////////////////
        // Reading the fairytale and related data
		var json = cc.loader.getRes(vRes.Fairytale_json);
		if( !json ) {
			cc.log("ERROR: Can't open resource file for "+this.parent().game+"/"+this.parent().variation);
			cc.director.runScene($b);
		}
		this._text = json.text;
		this._sphinx = json.sphinx;

/*		var tmpWords = ["The","quickbrown","foxjumps","over","the","lazy","dog"];
		for( var i=0; i<tmpWords.length ; i++ ) {
			var ship = new Battleship(tmpWords[i]);
			ship.findPosition({col:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH),row:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH)},Math.floor(Math.random()*2)*90);
			s1.addChild(ship,10);
			ship.setOpacity(0);
			ship.setRotation(ship.getRotation()+180);
			ship.setScale(1);
			ship.runAction(
				cc.sequence(
					cc.delayTime(2),
					cc.EaseSineOut.create(
						cc.spawn(
							cc.scaleTo(1.4,0.5),
							cc.rotateBy(1.4,180),
							cc.fadeIn(1.4)
						)
					)
				)
			);
			cc.log("Pos: "+ship.getPosition().x+"/"+ship.getPosition().y);
		}*/
		
		var ship = new Battleship("Helt");
		s1.addChild(ship,10);
		ship.findPosition({row:5,col:5},0);

		var ship = new Battleship("Hif");
		s1.addChild(ship,10);
		ship.findPosition({row:3,col:6},90);

		var drawNode = cc.DrawNode.create();
        drawNode.clear();
        for( var i=1 ; i<_B_MAX_SHIP_LENGTH ; i++ ) {
	        drawNode.drawSegment(cc.p(i*_B_SQUARE_SIZE,560),cc.p(i*_B_SQUARE_SIZE,0),0.5,new cc.Color(255,0,0,100));
	        drawNode.drawSegment(cc.p(560,i*_B_SQUARE_SIZE),cc.p(0,i*_B_SQUARE_SIZE),0.5,new cc.Color(255,0,0,100));
		}
        s1.addChild(drawNode,20);

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
        // Build ships
		var r = this._rounds[this._round];  
		
		for( var i=0 ; i<r.length ; i++ ) {
		

		}		


		
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


// Battleship is the base class for all ships 
//
// Methods
// -------
// ctor 
//
// Properties
// buildShip 
// destroyShip

var Battleship = cc.Node.extend({
	_word: null,
	_row: null,
	_col: null,
	_rotation: 0, // 0 or 90
	
	ctor: function(word) {
	
	    cc.assert( word && word.length >=2 && word.length <= _B_MAX_SHIP_LENGTH , "I need a word with a length between 2 and "+_B_MAX_SHIP_LENGTH );
    	
		this._super();
		
		this._word = word;
		this.buildShip();	
		
		this.setCascadeOpacityEnabled(true);
	},
	
	onEnter: function() {
		this._super();
	},
	
	onExit: function() {
		this._super();
		this.destroyShip();
	},		

    // buildShip creates a ship in a certain length
	//
    buildShip: function() {
		var wl = this._word.length;

		// create the sprites and add them to the node		
		this.addChild(cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_front"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2)));
		for( var i=1 ; i<wl-1 ; i++ ) {
			this.addChild(cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_middle"+(parseInt(Math.random()*3+1))),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2)));
		}
		this.addChild(cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_back"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2)));

		// set positions
		for( var i=0 ; i<wl ; i++ ) {
			this.children[i].setPosition(cc.p(0, (wl/2-i)*_B_SQUARE_SIZE*2 - _B_SQUARE_SIZE));
		}
		this.setScale(0.50);

		_b_retain(this,"Battleship: buildShip");		
    },
    
    setPosition: function(pos) {
    	if( pos !== undefined && (typeof pos !== "object" || pos.col === undefined) ) return cc.Node.prototype.setPosition.call(this,row);
    	
    	if( pos === undefined ) {
    		pos = this._pos;
    	} else {
    		this._pos = pos;
    	}
    	cc.assert(pos.row !== undefined && pos.row>=0 && pos.row<_B_MAX_SHIP_LENGTH && pos.col !== undefined && pos.col>=0 && pos.col<_B_MAX_SHIP_LENGTH, "buildShip: Illegal position of ship." );
    	
    	pos.row = parseInt(pos.row);
    	pos.col = parseInt(pos.col);
    	
    	var wl = this._word.length,
    		xOffset = this._rotation===0?0.5:(wl%2?0.5:0),
    		yOffset = this._rotation===0?(wl%2?0.5:0):0.5,
    		x = (pos.col+xOffset) * _B_SQUARE_SIZE,
    		y = (pos.row+yOffset) * _B_SQUARE_SIZE;
    		
    	cc.Node.prototype.setPosition.call(this,cc.p(x,y));
    },
    
    getPosition: function() {
    	return this._pos;
    },
    
    getLength: function() {
    	return this._word.length;
    },
    
    setRotation: function(rotation) {
    	if( rotation === undefined ) return cc.Node.prototype.setRotation.call(this,this._rotation);

    	if( rotation === 0 || rotation === 90 ) this._rotation = rotation;
		this.findPosition();    	
    	return cc.Node.prototype.setRotation.call(this,rotation);
    },
    
    findPosition: function(pos, rotation) {
    	var wl = this._word.length;

		if( pos === undefined ) {
			pos = this._pos;
		}
		
		if( rotation && rotation == 0 || rotation == 90 ) {
			this._rotation = rotation;
			cc.Node.prototype.setRotation.call(this,rotation);
		}
		
		// move it into the sea
		if( this._rotation === 0 ) {
			pos.row = Math.max(Math.min(pos.row,Math.floor(_B_MAX_SHIP_LENGTH-wl/2)),Math.floor(wl/2));
			pos.col = Math.max(Math.min(pos.col,_B_MAX_SHIP_LENGTH-1),0);
		} else if (this._rotation === 90){
			pos.row = Math.max(Math.min(pos.row,_B_MAX_SHIP_LENGTH-1),0);
			pos.col = Math.max(Math.min(pos.col,Math.floor(_B_MAX_SHIP_LENGTH-wl/2)),Math.floor(wl/2));
		} else {
			cc.assert(false,"Must be 0 or 90 degree rotation!")
		}
		
		this._pos = pos;

		// look for collisions in all children
		ships = this.getParent() && this.getParent().getChildren() || [];
		for( var i=0 ; i<ships.length ; i++ ) {
			ship = ships[i];
			if( ship !== this && ship.getCollision ) {
				if( this.getCollision(ship) ) cc.log("COLLISION!");
				else cc.log("... no collision ...");
			}
		}
		
		this.setPosition(pos);
    },
    
    getCollision: function(ship) {
    	var r1 = this.getRotation(),
    		r2 = ship.getRotation(),
    		p1 = this.getPosition(),
    		p2 = ship.getPosition(),
    		l1 = this.getLength(),
    		l2 = ship.getLength();
    		
		cc.assert((r1 === 0 || r1 === 90) && (r2 === 0 || r2 === 90),"Collision detection only works with 0 and 90 degree rotation.");
		// ... if both ships head into the same direction
		if( r1 === r2 ) {
			if( r1 === 0 && p1.col === p2.col ) {
				var distance = Math.abs(p1.row-p2.row),
					spaceNeeded = (l1+l2)/2;
				if( distance < spaceNeeded ) return true;
			} else if(r1 === 90 && p1.row === p2.row ) {
				var distance = Math.abs(p1.col-p2.col),
					spaceNeeded = (l1+l2)/2;
				if( distance < spaceNeeded ) return true;				
			}
		// ... if both ships head into different directions
		} else {
			p1.rowOffset = p1.row - (l1%2==0&&r1==0? 0.5:0);
			p2.rowOffset = p2.row - (l2%2==0&&r2==0? 0.5:0);
			p1.colOffset = p1.col - (l1%2==0&&r1==90? 0.5:0);
			p2.colOffset = p2.col - (l2%2==0&&r2==90? 0.5:0);
			var rowDistance = Math.abs(p1.rowOffset-p2.rowOffset),
				colDistance = Math.abs(p1.colOffset-p2.colOffset),
				rowSpace = (r1==0? l1+1:l2+1)/2,
				colSpace = (r1==0? l2+1:l1+1)/2;
				
			if( rowDistance < rowSpace && colDistance < colSpace ) return true;
		}
		return false;    		
    },
    
    destroyShip: function(ship) {
		_b_release(this);
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
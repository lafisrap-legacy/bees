// WordBattleLayer Constants
//
var _B_MAX_SHIP_LENGTH = 10,	// maximum ship length (or size of the sea)
	_B_SQUARE_SIZE = 56,
	_B_WORDS_PER_ROUND = 7,		// maximum number of words per round
	_B_MODE_TITLE = 1,
	_B_MODE_MOVING = 2,
	_B_MODE_BOMBING = 3,
	_B_MODE_WATCHING = 4,
	_B_TAP_TIME = 200,

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
	_fairy: null,
	_pureWords: null,
	_fullWords: null,
	_rounds: null,
	_round: null,
	_first: null,
	_mode: null,
	
	// event callbacks
	_onShipMovementCb: null,  // called if a ship is dragged or turned

	
    ctor:function () {
    	var self = this;
    
        this._super();

        //////////////////////////////
        // Get the sprite sheet
    	cc.spriteFrameCache.addSpriteFrames(gRes.wordbattle_plist);	    

        //////////////////////////////
        // Register computer player
        // todo ...
        
        //////////////////////////////
        // Connect other player
		$b.connectPlayer(function(player) {
			if( !player ) {
				cc.director.runScene($b);
				return;
			}

			cc.log("Player "+player.name+" connected (sid:"+player.sid+")!");
			
			self._first = player.first === "yes";			
			
			startscreen.runAction(
				cc.sequence(
					cc.fadeOut(0.5),
					cc.callFunc(function() {
						self.removeChild(startscreen);
						_b_release(startscreen);
					})
				)
			);
			
			//////////////////////////////
			// Create and show seas
			var s1 = self._ownSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,560,560));
			s1.setPosition(cc.p(284,cc.height/2));
			s1.setScale(0.0);
			s1.setOpacity(0);
			s1.runAction(
				cc.EaseSineOut.create(
					cc.spawn(
						cc.scaleTo(0.90, 1),
						cc.fadeIn(0.90)
					)
				)
			);
			var s2 = self._otherSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1"),cc.rect(0,0,560,560));
			s2.setPosition(cc.p(852,cc.height/2));
			s2.setScale(0.0);
			s2.setOpacity(0);
			s2.runAction(
				cc.sequence(
					cc.EaseSineOut.create(
						cc.spawn(
							cc.scaleTo(1.00,1),
							cc.fadeIn(1.00)
						)
					),
					cc.callFunc(function() {
						cc.eventManager.dispatchCustomEvent("seas_have_moved_in");		
					})
				)
			);
			self.addChild(s1,0);
			self.addChild(s2,0);
			
			self.startGame();
		}, this.gameUpdate, this);

		//////////////////////////////
		// Create and show title screen
		var startscreen = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("startscreen"),cc.rect(0,0,1136,640));
		startscreen.setPosition(cc.p(cc.width/2, cc.height/2));
		startscreen.setScale(0.9);
		startscreen.setOpacity(0);
		startscreen.runAction(
			cc.spawn(
				cc.fadeIn(0.5),
				cc.scaleTo(0.5,1)
			)
		);
		this.addChild(startscreen,0);
		_b_retain(startscreen, "startscreen");

        //////////////////////////////
        // Reading the fairytale and related data
		var json = cc.loader.getRes(vRes.Fairytale_json);
		if( !json ) {
			cc.log("ERROR: Can't open resource file for "+this.parent().game+"/"+this.parent().variation);
			cc.director.runScene($b);
		}
		this._text = json.text;
		this._sphinx = json.sphinx;

/*		var drawNode = cc.DrawNode.create();
        drawNode.clear();
        for( var i=1 ; i<_B_MAX_SHIP_LENGTH ; i++ ) {
	        drawNode.drawSegment(cc.p(i*_B_SQUARE_SIZE,560),cc.p(i*_B_SQUARE_SIZE,0),0.5,new cc.Color(255,0,0,100));
	        drawNode.drawSegment(cc.p(560,i*_B_SQUARE_SIZE),cc.p(0,i*_B_SQUARE_SIZE),0.5,new cc.Color(255,0,0,100));
		}
        s1.addChild(drawNode,20);*/
        
		this._mode = _B_MODE_TITLE;	
		//this.initListeners();
		
		this._fairy = new GameFairy();
		this._hourglass = new Hourglass(cc.p(750,120));
        this.addChild(this._fairy,10);
        this.addChild(this._hourglass,10);
		_b_retain(this._fairy, "Fairy");
		_b_retain(this._hourglass, "Hourglass");

        return true;
    },
    
    onExit: function() {
        this._super();
        
		_b_release(this._fairy);
		_b_release(this._hourglass);

    	this.stopListeners();
    },
    
    // startGame starts the game, selecting the start paragraph, selecting a priority list from the collectors book, looking through suggestions of other player
    startGame: function() {
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
		this._round = 0;
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

			$b.sendMessage({ message: "initRounds", rounds: this._rounds });
		} else {
			$b.receiveMessage(function(data) {
				cc.assert(data.message === "initRounds", "Received wrong message ('"+data.message+"' instead of 'initRounds') while starting episode.");
				self._rounds = data.rounds;
				self.startRound();
			});
		}
	},
	
	startRound: function(allStrait) {
		var self = this;
	
        //////////////////////////////
        // Build ships
		var r = this._rounds[this._round],
			own = this._ownSea;  
		
		for( var i=0; i<r.length ; i++ ) {

			var word = this._pureWords[r[i]];
			if( word.length > _B_MAX_SHIP_LENGTH ) continue; // don't take words that don't fit ...
			cc.log("Creating ship with '"+word+"', this._round: "+this._round);
			var ship = new Battleship(word);
				
			own.addChild(ship,10);
			var rotation = allStrait!==undefined? allStrait : Math.floor(Math.random()*2)*90;
			var pos = ship.findPosition({col:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH),row:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH)},rotation);
			if( !pos ) {
				cc.log("Didn't find room for the ship. Setting all ships strait...");
				own.removeAllChildren();
				return this.startRound(Math.floor(Math.random()*2)*90);
			}
			cc.log("Placing ship at "+JSON.stringify(pos)+" with rotation "+rotation);
			ship.setRCPosition(pos);
			ship.setRotation(rotation);
		}

		for( var i=0; i<own.children.length ; i++ ) {
			var ship = own.children[i];
		
			ship.setOpacity(0);
			ship.setRotation(ship.getRotation()+180);
			ship.setScale(0.6);
			ship.runAction(
				cc.sequence(
					cc.EaseSineOut.create(
						cc.spawn(
							cc.scaleTo(1.4,0.5),
							cc.rotateBy(1.4,180),
							cc.fadeIn(1.4)
						)
					)
				)
			);
		}		
		
		this.letShipsBeMoved();
		
		var fairy = this._fairy,
			hg = this._hourglass;
		
		_b_one(["seas_have_moved_in"], function() {
			// first set the right rects, after first they were set while the ships were moving (yes, that's a hack ...)
			for( var i=0; i<own.children.length ; i++ ) own.children[i].setRCPosition();	
					
			fairy.show(0);
			fairy.say(_b_remember("fairies.move_ships")?10:2, 5, _b_t.fairies.move_ships);
			_b_one(["in_20_seconds", "a_ship_was_moved"], function(data) {
				fairy.silent().show(1).say(0, 5, _b_t.fairies.press_it );
				hg.show();
				hg.countdown(10);

				_b_one(["countdown_finished", "hourglass_is_clicked"], function() {
					hg.clearCountdown();
					self.sendInitialBoard();
				});
			});
		});
	},
	
	// multiple call ins
	// wait and click function
	
	sendInitialBoard: function(result) {
		var self = this,
			own = this._ownSea,
			fairy = this._fairy,
			hg = this._hourglass;
			
		this.stopShipsBeMoved();
		
		_b_one(["a_ship_was_moved","in_0.35_seconds"], function(data) {
			var tiles = [];
			for( var i=0 ; i<own.children.length ; i++ ) {
				var tile = own.children[i];
			
				if( tile.isTile ) {
					tiles.push({
						word: tile.getWord(),
						pos: tile.getRCPosition(),
						rotation: tile.getRotation()
					});
				}
			}
	
			hg.show();
			cc.log("Send message with initBoard!");
			$b.sendMessage({ message: "initBoard", tiles: tiles });
			$b.receiveMessage(function(otherBoard) {
				cc.assert(otherBoard.message === "initBoard", "Received wrong message ('"+otherBoard.message+"' instead of 'initBoard') while starting round.");
				cc.assert(otherBoard.tiles.length === tiles.length, "I got "+otherBoard.tiles.length+" ships, but I have "+tiles.length+" while starting round.");

				cc.log("Starting countdown ...");
				fairy.show(2);
				fairy.say(0, 4, _b_t.fairies.lets_go);
				hg.countdown(3);					

				_b_one("countdown_finished" , function() {
					hg.clearCountdown();

					for( var other=self._otherSea, i=0 ; i<otherBoard.tiles.length ; i++ ) {
						var tile = otherBoard.tiles[i];
						var ship = new Battleship(tile.word);
						other.addChild(ship,10);
						ship.setRCPosition(tile.pos);
						ship.setRotation(tile.rotation);					
					}
				});
			});
		});
	},

    letShipsBeMoved: function() {
		var self = this,
			start = null,
			startTime = null,
			offset = null,
			draggedShip = null,
			shipMoves = false,
			lastTouch, lastEvent;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {
				var touch = touches[0],
				start = touch.getLocation();
				startTime = new Date().getTime();
				
				// Player taps on a ship in his own see?
				if( !draggedShip ) {
					cc.log("Looking for ship to drag or turn ...");
					var ships = self._ownSea.getChildren();
					for( var i=0 ; i<ships.length ; i++ ) {
						var rect = ships[i].getRect && ships[i].getRect() || cc.rect(0,0,0,0),
							pos = ships[i].getPosition(),
							tp = cc.p(start.x - rect.x, start.y - rect.y);

						if( tp.x >= 0 && tp.x< rect.width && tp.y >=0 && tp.y<rect.height ) {
							draggedShip = ships[i];
							offset = {
								x: start.x - pos.x,
								y: start.y - pos.y
							};
							cc.log("Found it on position "+JSON.stringify(draggedShip._pos));
							return
						} 
					}		
				}
			},
			onTouchesMoved: function(touches, event) {
				var touch = touches[0],
					loc = touch.getLocation();
					
				lastTouch = touches;
				lastEvent = event;
				
				if(draggedShip) {
					draggedShip.setPosition(cc.p(loc.x-offset.x,loc.y-offset.y));
				}
			},
			onTouchesEnded: function(touches, event){

				var touch = touches[0],
					loc = touch.getLocation(),
					time = new Date().getTime() - startTime;	

				if( draggedShip && !shipMoves ) {
					shipMoves = true;
					if( time < _B_TAP_TIME ) {
						var rotation = draggedShip.getRotation();
							
						var pos = draggedShip.findPosition(undefined, 90-rotation);
						if( !pos ) {
							draggedShip.runAction(
								cc.sequence(
									cc.EaseSineOut.create(
										cc.rotateBy(0.11, 30)
									),
									cc.EaseSineIn.create(
										cc.rotateBy(0.11, -30)
									),
									cc.callFunc(function() {
										draggedShip.setRCPosition();
										draggedShip = null;
										shipMoves = false;
										cc.eventManager.dispatchCustomEvent("a_ship_was_moved", draggedShip);					
									})
								)
							);
						} else {
							var endPos = draggedShip.getXYPosition(pos, 90-rotation);
							draggedShip.runAction(
								cc.sequence(
									cc.EaseSineOut.create(
										cc.spawn(
											cc.rotateTo(0.33, 90-rotation),
											cc.moveTo(0.33, endPos)
										)
									),
									cc.callFunc(function() {
										draggedShip.setRotation(90-rotation);
										draggedShip.setRCPosition(pos);
										draggedShip = null;
										shipMoves = false;
										cc.eventManager.dispatchCustomEvent("a_ship_was_moved", draggedShip);					
									})
								)
							);
						}
					} else {
						var posStart = draggedShip.getPosition(),
							posEnd = draggedShip.findPosition({
								row: Math.floor((loc.y-offset.y)/_B_SQUARE_SIZE),
								col: Math.floor((loc.x-offset.x)/_B_SQUARE_SIZE)
							});

						draggedShip.runAction(
							cc.sequence(
								cc.moveTo(0.11, draggedShip.getXYPosition(posEnd)),
								cc.callFunc(function() {
									draggedShip.setRCPosition(posEnd);
									draggedShip = null;
									shipMoves = false;
									cc.eventManager.dispatchCustomEvent("a_ship_was_moved", draggedShip);					
								})
							)
						)
					}					
				}
			},
			dropShip:  function() {
				if( draggedShip ) this.onTouchesEnded(lastTouch, lastEvent);
			}
		});
		
		cc.eventManager.addListener(this._touchListener, this);
	},
	
	stopShipsBeMoved: function() {
        if( this._touchListener ) {
        	this._touchListener.dropShip();
        	cc.eventManager.removeListener(this._touchListener);
        }
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
	_rect: null,
	_rotation: 0, // 0 or 90
	
	ctor: function(word) {
	
	    cc.assert( word && word.length >=2 && word.length <= _B_MAX_SHIP_LENGTH , word+" is too short or too long. I need a word with a length between 2 and "+_B_MAX_SHIP_LENGTH );
    	
		this._super();
		
		this._word = word;
		this.buildShip();	
		this.isTile = true;
		
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
    
    getWord: function() {
    	return this._word;
    },
    
    setRCPosition: function(pos) {
    	if( pos === undefined ) {
    		pos = this._pos;
    	} else {
    		this._pos = pos;
    	}
    	cc.assert(pos.row !== undefined && pos.row>=0 && pos.row<_B_MAX_SHIP_LENGTH && pos.col !== undefined && pos.col>=0 && pos.col<_B_MAX_SHIP_LENGTH, "buildShip: Illegal position of ship." );
    	
    	pos.row = parseInt(pos.row);
    	pos.col = parseInt(pos.col);
    	
    	cc.Node.prototype.setPosition.call(this,this.getXYPosition(pos));
    	
    	// computing the bounding rectangle in world coordinates. It is assumed, that the first children are the sprites!
    	var cl = this._word.length,
    		pos1 = this.convertToWorldSpace(this.children[0].getPosition()),
    		pos2 = this.convertToWorldSpace(this.children[cl-1].getPosition()),
    		minX = Math.min(pos1.x, pos2.x)-_B_SQUARE_SIZE/2,
    		maxX = Math.max(pos1.x, pos2.x)+_B_SQUARE_SIZE/2,
    		minY = Math.min(pos1.y, pos2.y)-_B_SQUARE_SIZE/2,
    		maxY = Math.max(pos1.y, pos2.y)+_B_SQUARE_SIZE/2;
    		
    	this._rect = cc.rect(minX, minY, maxX-minX, maxY-minY);
    	
/*    	var drawNode = cc.DrawNode.create();
	    drawNode.drawRect({x:minX,y:minY}, {x:maxX,y:maxY}, cc.color(255,0,0,30));
        this.getParent().getParent().addChild(drawNode,20);*/

    	cc.log("setRCPosition: rect: "+JSON.stringify(this._rect)+", row/col: "+JSON.stringify(pos));
    	
    },
    
    getXYPosition: function(pos, rotation) {
    	var wl = this._word.length,
    		rotation = rotation!==undefined? rotation : this._rotation,
    		xOffset = rotation===0?0.5:(wl%2?0.5:0),
    		yOffset = rotation===0?(wl%2?0.5:0):0.5,
    		x = (pos.col+xOffset) * _B_SQUARE_SIZE,
    		y = (pos.row+yOffset) * _B_SQUARE_SIZE;
    		
    		return cc.p(x,y);    		
    },
    
    getRCPosition: function() {
	    return this._pos;
    },
    
    getLength: function() {
    	return this._word.length;
    },
    
    setRotation: function(rotation) {
    	if( rotation === 0 || rotation === 90 ) { 
    		this._rotation = rotation;
			var pos = this.findPosition();
			if( pos ) {
				var ret = cc.Node.prototype.setRotation.call(this,rotation);
				this.setRCPosition(pos);
				return ret;
			}
			else return false;
		} else {
			cc.Node.prototype.setRotation.call(this,rotation!==undefined?rotation:this._rotation);
		}
    },

    getRotation: function(degree) {
    	if( degree ) return cc.Node.prototype.getRotation.call(this);
	    else return this._rotation;
    },
    
    findPosition: function(pos, rotation, collisionBase) {
    	var wl = this._word.length;

		if( pos === undefined ) {
			pos = {
				row: this._pos.row,
				col: this._pos.col
			};	
		}	
		if( rotation === undefined ) rotation = this._rotation;

		// moving the ship into the sea		
		if( rotation === 0 ) {
			pos.row = Math.max(Math.min(pos.row,Math.floor(_B_MAX_SHIP_LENGTH-wl/2)),Math.floor(wl/2));
			pos.col = Math.max(Math.min(pos.col,_B_MAX_SHIP_LENGTH-1),0);
		} else if( rotation === 90 ){
			pos.row = Math.max(Math.min(pos.row,_B_MAX_SHIP_LENGTH-1),0);
			pos.col = Math.max(Math.min(pos.col,Math.floor(_B_MAX_SHIP_LENGTH-wl/2)),Math.floor(wl/2));
		} else {
			cc.assert(false,"Must be 0 or 90 degree rotation!")
		}
		
		// look for collisions with all siblings
		ships = this.getParent && this.getParent().getChildren() || [];
		for( var i=0 ; i<ships.length ; i++ ) {
			ship = ships[i];
			if( ship !== this && ship.getCollision ) {
				if( this.getCollision(ship, pos, rotation) ) {
					var c = collisionBase || {
							pos: pos,
							offset: [0,0,0,0,0,0,0,0],
							index: 0,
							directions: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
						};
						
					for( var i=0 ; i<c.offset.length ; i++ ) {
						c.offset[c.index]++;
						var newPos = {
							row: c.pos.row + c.directions[c.index][0] * c.offset[c.index],
							col: c.pos.col + c.directions[c.index][1] * c.offset[c.index]
						}
						++c.index; c.index %= c.offset.length;
						if(newPos.row>=0 && newPos.row<_B_MAX_SHIP_LENGTH && newPos.col>=0 && newPos.col<_B_MAX_SHIP_LENGTH ) break;
					}
					
					if( i<c.offset.length )	return this.findPosition(newPos, rotation, c);
					else return false;
				}
			}
		}
		
		return pos;
    },
    
    getCollision: function(ship, pos, rotation) {
    	var r1 = rotation!==undefined?rotation : this.getRotation(),
    		r2 = ship.getRotation(),
    		p1 = pos || this.getRCPosition(),
    		p2 = ship.getRCPosition(),
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
			var p1_rowOffset = p1.row - (l1%2==0&&r1==0? 0.5:0),
				p2_rowOffset = p2.row - (l2%2==0&&r2==0? 0.5:0),
				p1_colOffset = p1.col - (l1%2==0&&r1==90? 0.5:0),
				p2_colOffset = p2.col - (l2%2==0&&r2==90? 0.5:0);
			var rowDistance = Math.abs(p1_rowOffset-p2_rowOffset),
				colDistance = Math.abs(p1_colOffset-p2_colOffset),
				rowSpace = (r1==0? l1+1:l2+1)/2,
				colSpace = (r1==0? l2+1:l1+1)/2;
				
			if( rowDistance < rowSpace && colDistance < colSpace ) return true;
		}
		return false;    		
    },
    
    getRect: function() {
    	return this._rect;
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

        this.addChild(new WordBattleLayer());
    },
    
    onExit: function() {
        this._super();
    }
});
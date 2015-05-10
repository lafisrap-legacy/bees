// WordBattleLayer Constants
//
var _B_MAX_SHIP_LENGTH = 10,	// maximum ship length (or size of the sea)
	_B_SQUARE_SIZE = 56,
	_B_WORDS_PER_ROUND = 7,		// maximum number of words per round
	_B_HOURGLASS_POS = cc.p(668,80),
	_B_CANON_POS = cc.p(30,140),
	_B_CANONBALL_POS = cc.p(100,240),
	_B_CROSSHAIR_Y_OFFSET = _B_SQUARE_SIZE + 7,
	_B_DAMAGE_PROGRESS_DELAY = 0.1,
	_B_MAX_DAMAGE = 3,
	_B_LETTER_SIZE = 96,
	_B_TAP_TIME = 200,
	_B_MODE_TITLE = 1,
	_B_MODE_MOVING = 2,
	_B_MODE_BOMBING = 3,
	_B_MODE_WATCHING = 4,

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
	_bombs: [],
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
			var s1 = self._ownSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1.jpg"),cc.rect(0,0,560,560));
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
			var s2 = self._otherSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1.jpg"),cc.rect(0,0,560,560));
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
			_b_retain(s1,"WordBattleLayer: sea1");		
			_b_retain(s2,"WordBattleLayer: sea2");		

			self.startGame();
		}, this.gameUpdate, this);

		//////////////////////////////
		// Create and show title screen
		var startscreen = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("startscreen.jpg"),cc.rect(0,0,1136,640));
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
		_b_retain(startscreen,"Startscreen");
		
		cc.audioEngine.setMusicVolume(0.5);
		cc.audioEngine.playMusic(gRes.startscreen_mp3,true);

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
        this.addChild(this._fairy,10);
		_b_retain(this._fairy, "Fairy");
	/*	
		for( var i=0 ; i<3 ; i++ ) {	
			var bomb = new Bomb(this._fairy._space, cc.p(100+80*i,500+(i%2)*100),self._otherSea);
			bomb.getBody().applyImpulse(cp.v(30,100),cp.v(i*300,0));
			this._fairy.addChild(bomb,20);
		}
*/
        return true;
    },
    
    onExit: function() {
        this._super();
        
		_b_release(this._fairy);
		_b_release(this._hourglass);
		_b_release(this._ownSea);
		_b_release(this._otherSea);

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

		cc.audioEngine.setMusicVolume(0.5);
		cc.audioEngine.playMusic(gRes.organizing_intro_mp3,false);
		cc.audioEngine.addMusic(gRes.organizing_loop1_mp3,true);
		cc.audioEngine.addMusic(gRes.organizing_loop2_mp3,true);
		cc.audioEngine.addMusic(gRes.organizing_loop3_mp3,true);

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
			_b_one(["seas_have_moved_in"], function() {
				self.startRound();
			});

			$b.sendMessage({ message: "initRounds", rounds: this._rounds });
		} else {
			$b.receiveMessage("initRounds", function(data) {
				cc.assert(data.message === "initRounds", "Received wrong message ('"+data.message+"' instead of 'initRounds') while starting episode.");
				self._rounds = data.rounds;
				_b_one(["seas_have_moved_in"], function() {
					self.startRound();
				});
			});
		}
	},
	
	startRound: function(allStrait) {
		var self = this;
	
		//////////////////////////////
		// Build ships
		var r = self._rounds[self._round],
			own = self._ownSea;  
	
		for( var i=0; i<r.length ; i++ ) {

			var word = self._pureWords[r[i]];
			if( word.length > _B_MAX_SHIP_LENGTH ) continue; // don't take words that don't fit ...
			var ship = new Battleship(word);
			
			own.addChild(ship,10);
			var rotation = allStrait!==undefined? allStrait : Math.floor(Math.random()*2)*90;
			var coords = ship.findPosition({col:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH),row:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH)},rotation);
			if( !coords ) {
				own.removeAllChildren();
				return self.startRound(Math.floor(Math.random()*2)*90);
			}
			ship.setRCPosition(coords);
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
	
		self.letShipsBeMoved();
	
		var fairy = self._fairy;
	
		// first set the right rects, after first they were set while the ships were moving (yes, that's a hack ...)
		for( var i=0; i<own.children.length ; i++ ) own.children[i].setRCPosition();	
				
		fairy.show(0);
		fairy.say(_b_remember("fairies.move_ships")?10:2, 5, _b_t.fairies.move_ships);
		_b_one(["in_20_seconds"], function(data) {
			fairy.silent().show(2).say(0, 5, _b_t.fairies.move_ships );
		});
		_b_one(["a_ship_was_moved"], function(data) {
			_b_clear("in_20_seconds");
			
			var hg = self._hourglass = new Hourglass(self._fairy._space, _B_HOURGLASS_POS);
			self.addChild(self._hourglass,10);
			_b_retain(self._hourglass, "Hourglass");
			
			fairy.silent().show(1).say(0, 5, _b_t.fairies.press_it );
			hg.show();
			hg.countdown(30);

			_b_one(["countdown_finished", "hourglass_is_clicked"], function() {
				hg.clearCountdown();
				self.sendInitialBoard();
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
			
				if( tile._isTile ) {
					tiles.push({
						word: tile.getWord(),
						coords: tile.getRCPosition(),
						rotation: tile.getRotation()
					});
				}
			}
	
			hg.show();
			$b.sendMessage({ message: "initBoard", tiles: tiles });
			$b.receiveMessage("initBoard", function(otherBoard) {
				cc.assert(otherBoard.message === "initBoard", "Received wrong message ('"+otherBoard.message+"' instead of 'initBoard') while starting round.");
				cc.assert(otherBoard.tiles.length === tiles.length, "I got "+otherBoard.tiles.length+" ships, but I have "+tiles.length+" while starting round.");

				// set the ships
				for( var other=self._otherSea, i=0 ; i<otherBoard.tiles.length ; i++ ) {
					var tile = otherBoard.tiles[i];
					var ship = new Battleship(tile.word, true);
					other.addChild(ship,10);
					ship.setRCPosition(tile.coords);
					ship.setRotation(tile.rotation);							
				}

				cc.audioEngine.stopAllMusic();

				self.playRound();
			});
		});
	},

	playRound: function() {
		var self = this,
			own = this._ownSea,
			fairy = this._fairy,
			hg = this._hourglass;	

		cc.assert(hg, "playRound assumes to have an hourglass at the beginning.")

		fairy.show(2);
		fairy.say(0, 2, _b_t.fairies.lets_go);

		// start always with three bombs
		for( var i=0 ; i<3 ; i++ ) {	
			self._bombs[i] = new Bomb(fairy._space, cc.p(100+80*i,500+(i%2)*100),self._otherSea);
			self._bombs[i].getBody().applyImpulse(cp.v(30,100),cp.v(i*300,0));
			fairy.addObject(self._bombs[i]);
		}

		_b_one("in_2_seconds" , function() {
			hg.hide(function() {
				hg.exit();
				self.removeChild(hg);
				_b_release(hg);
				self._hourglass = null;
			});
			fairy.hide();

			for( var i=0 ; i<3 ; i++ ) {	
				self._bombs[i].setTimer(30);
			}

			_b_one(["last_object_gone","bomb_time_is_up"], function() {
							
				fairy.show(3);
				fairy.say(0, 99, _b_t.fairies.ceasefire);

				$b.stopMessage("bomb");
				$b.sendMessage({ message: "ceasefire" });
				$b.receiveMessage("ceasefire", function(data) {

					_b_one("in_4_seconds", function() {
						fairy.silent();
						fairy.show(4);
						fairy.say(0, 3, _b_t.fairies.results);
					
						_b_one("in_3_seconds", function() {
							var own = self._ownSea.getChildren(),
								other = self._otherSea.getChildren();

							var progressDamage = function(ships) {
								var i=0,
									interval = setInterval(function() {
										if( ships[i]._isTile ) ships[i].progressDamage();
										if( ++i >= ships.length ) clearInterval(interval);
									}, _B_DAMAGE_PROGRESS_DELAY*1000);
							};

							progressDamage(own);
							progressDamage(other);
							
							_b_one("in_7_seconds", function() {

								fairy.say(0, 3, _b_t.fairies.ready);

								_b_one("in_3_seconds", function() {
									
									var hg = self._hourglass = new Hourglass(self._fairy._space, _B_HOURGLASS_POS);
									self.addChild(self._hourglass,10);
									_b_retain(self._hourglass, "Hourglass");
									hg.show();
									fairy.show(5);
									fairy.say(1,3, _b_t.fairies.press_it);

									_b_one("hourglass_is_clicked", function() {
										$b.sendMessage({ message: "playRound" });

										hg.getBody().applyImpulse(cp.v(0,60000),cp.v(0,0));
										$b.receiveMessage("playRound", function() {
											self.playRound();
										});
									});
								})
							})
						});
					});
				});
			});

			(function receiveBomb() {
				$b.receiveMessage("bomb", function(data) {
					var pos = data.pos,
						seaRect = self._ownSea.getBoundingBox(),
						flyingBomb = new FlyingBomb(self._ownSea, true);

					fairy.addChild(flyingBomb);

					flyingBomb.land(cc.p(seaRect.x+pos.x, seaRect.y+pos.y), function(hit) {
						fairy.removeChild(flyingBomb);
					});

					receiveBomb();
				});
			})();
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
							cc.log("Found it on position "+JSON.stringify(draggedShip._coords));
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
							
						var coords = draggedShip.findPosition(undefined, 90-rotation);
						if( !coords ) {
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
							var endPos = draggedShip.getXYPosition(coords, 90-rotation);
							draggedShip.runAction(
								cc.sequence(
									cc.EaseSineOut.create(
										cc.spawn(
											cc.rotateTo(0.33, rotation-90),
											cc.moveTo(0.33, endPos)
										)
									),
									cc.callFunc(function() {
										draggedShip.setRotation(90-rotation);
										draggedShip.setRCPosition(coords);
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
	_hidden: false,
	_rect: null,
	_rotation: 0, // 0 or 90
	_coords: null,
	_isTile: true,
	
	ctor: function(word, hidden) {
	
	    cc.assert( word && word.length >=2 && word.length <= _B_MAX_SHIP_LENGTH , word+" is too short or too long. I need a word with a length between 2 and "+_B_MAX_SHIP_LENGTH );
    	
		this._super();
		
		this._word = word;
		this._hidden = hidden;
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
		var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_front.png"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2));
		sprite._shipDamaged = "ship1_front_damaged.png";
		this.addChild(sprite);
		for( var i=1 ; i<wl-1 ; i++ ) {
			var shipPart = parseInt(Math.random()*3+1),
				sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_middle"+shipPart+".png"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2));
			sprite._shipDamaged = "ship1_middle"+shipPart+"_damaged.png";
			this.addChild(sprite);
		}
		var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_back.png"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2));
		sprite._shipDamaged = "ship1_back_damaged.png";
		this.addChild(sprite);

		// set positions
		for( var i=0 ; i<wl ; i++ ) {
			var part = this.children[i];
			part.setPosition(cc.p(0, (wl/2-i)*_B_SQUARE_SIZE*2 - _B_SQUARE_SIZE));
			part._damage = 0;
			part._letter = this._word[i];
			if( this._hidden ) {
				part.setOpacity(0);
			}
		}
		
		this.setScale(0.50);

		_b_retain(this,"Battleship: buildShip");		
    },
    
    getWord: function() {
    	return this._word;
    },
    
    setRCPosition: function(coords) {
    	if( coords === undefined ) {
    		coords = this._coords;
    	} else {
    		this._coords = coords;
    	}
    	cc.assert(coords.row !== undefined && coords.row>=0 && coords.row<_B_MAX_SHIP_LENGTH && coords.col !== undefined && coords.col>=0 && coords.col<_B_MAX_SHIP_LENGTH, "buildShip: Illegal position of ship." );
    	
    	coords.row = parseInt(coords.row);
    	coords.col = parseInt(coords.col);
    	
		var pos = this.getXYPosition(coords);
    	cc.Node.prototype.setPosition.call(this,pos);

    	// computing the bounding rectangle in world coordinates.
    	var cl = this._word.length,
			box = this.getParent().getBoundingBox();

		this._rect = this._rotation === 0? cc.rect(pos.x-_B_SQUARE_SIZE/2+box.x, pos.y-cl*_B_SQUARE_SIZE/2+box.y, _B_SQUARE_SIZE , cl*_B_SQUARE_SIZE):
										   cc.rect(pos.x-cl*_B_SQUARE_SIZE/2+box.x, pos.y-_B_SQUARE_SIZE/2+box.y , cl*_B_SQUARE_SIZE , _B_SQUARE_SIZE);
    },
    
    getXYPosition: function(coords, rotation) {
    	var wl = this._word.length,
    		rotation = rotation!==undefined? rotation : this._rotation,
    		xOffset = rotation===0?0.5:(wl%2?0.5:0),
    		yOffset = rotation===0?(wl%2?0.5:0):0.5,
    		x = (coords.col+xOffset) * _B_SQUARE_SIZE,
    		y = (coords.row+yOffset) * _B_SQUARE_SIZE;
    		
    		return cc.p(x,y);    		
    },
    
    getRCPosition: function() {
	    return this._coords;
    },
    
    getLength: function() {
    	return this._word.length;
    },
    
    setRotation: function(rotation) {
    	if( rotation === 0 || rotation === 90 ) { 
    		this._rotation = rotation;
			var coords = this.findPosition();
			if( coords ) {
				var ret = cc.Node.prototype.setRotation.call(this,-rotation);
				this.setRCPosition(coords);
				return ret;
			}
			else return false;
		} else {
			cc.Node.prototype.setRotation.call(this,rotation!==undefined?-rotation:-this._rotation);
		}
    },

    getRotation: function(degree) {
    	if( degree ) return cc.Node.prototype.getRotation.call(this);
	    else return this._rotation;
    },
    
    findPosition: function(coords, rotation, collisionBase) {
    	var wl = this._word.length;

		if( coords === undefined ) {
			coords = { 
				row : this._coords.row,
				col : this._coords.col
			};
		}
		if( rotation === undefined ) rotation = this._rotation;

		// moving the ship into the sea		
		if( rotation === 0 ) {
			coords.row = Math.max(Math.min(coords.row,Math.floor(_B_MAX_SHIP_LENGTH-wl/2)),Math.floor(wl/2));
			coords.col = Math.max(Math.min(coords.col,_B_MAX_SHIP_LENGTH-1),0);
		} else if( rotation === 90 ){
			coords.row = Math.max(Math.min(coords.row,_B_MAX_SHIP_LENGTH-1),0);
			coords.col = Math.max(Math.min(coords.col,Math.floor(_B_MAX_SHIP_LENGTH-wl/2)),Math.floor(wl/2));
		} else {
			cc.assert(false,"Must be 0 or 90 degree rotation!")
		}
		
		// look for collisions with all siblings
		ships = this.getParent && this.getParent().getChildren() || [];
		for( var i=0 ; i<ships.length ; i++ ) {
			ship = ships[i];
			if( ship !== this && ship.getCollision ) {
				if( this.getCollision(ship, coords, rotation) ) {
					var c = collisionBase || {
							coords: coords,
							offset: [0,0,0,0,0,0,0,0],
							index: 0,
							directions: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]
						};
						
					for( var i=0 ; i<c.offset.length ; i++ ) {
						c.offset[c.index]++;
						var newCoords = {
							row: c.coords.row + c.directions[c.index][0] * c.offset[c.index],
							col: c.coords.col + c.directions[c.index][1] * c.offset[c.index]
						}
						++c.index; c.index %= c.offset.length;
						if(newCoords.row>=0 && newCoords.row<_B_MAX_SHIP_LENGTH && newCoords.col>=0 && newCoords.col<_B_MAX_SHIP_LENGTH ) break;
					}
					
					if( i<c.offset.length )	return this.findPosition(newCoords, rotation, c);
					else return false;
				}
			}
		}
		
		return coords;
    },
    
    getCollision: function(ship, coords, rotation) {
    	var r1 = rotation!==undefined?rotation : this.getRotation(),
    		r2 = ship.getRotation(),
    		p1 = coords || this.getRCPosition(),
    		p2 = ship.getRCPosition(),
    		l1 = this.getLength(),
    		l2 = ship.getLength();
    		
		cc.assert((r1 === 0 || r1 === 90) && (r2 === 0 || r2 === 90),"Collision detection only works with 0 and 90 degree rotation.");

		var p1_rowOffset = p1.row - (l1%2==0&&r1==0? 0.5:0),
			p2_rowOffset = p2.row - (l2%2==0&&r2==0? 0.5:0),
			p1_colOffset = p1.col - (l1%2==0&&r1==90? 0.5:0),
			p2_colOffset = p2.col - (l2%2==0&&r2==90? 0.5:0);
				
		// ... if both ships head into the same direction
		if( r1 === r2 ) {
			if( r1 === 0 && p1.col === p2.col ) {
				var distance = Math.abs(p1_rowOffset-p2_rowOffset),
					spaceNeeded = (l1+l2)/2;
				if( distance < spaceNeeded ) return true;
			} else if(r1 === 90 && p1.row === p2.row ) {
				var distance = Math.abs(p1_colOffset-p2_colOffset),
					spaceNeeded = (l1+l2)/2;
				if( distance < spaceNeeded ) return true;				
			}

		// ... if both ships head into different directions
		} else {
			var	rowDistance = Math.abs(p1_rowOffset-p2_rowOffset),
				colDistance = Math.abs(p1_colOffset-p2_colOffset),
				rowSpace = (r1==0? l1+1:l2+1)/2,
				colSpace = (r1==0? l2+1:l1+1)/2;
				
			if( rowDistance < rowSpace && colDistance < colSpace ) return true;
		}
		return false;    		
    },

	dropBomb: function(pos) {
		var rect = this._rect;
		if( cc.rectContainsPoint(rect, pos) ) {
			var col = Math.floor((pos.x-rect.x)/_B_SQUARE_SIZE),
				row = Math.floor((pos.y-rect.y)/_B_SQUARE_SIZE),
				i = this._rotation===0? this._word.length-row-1 : col,
				part = this.children[i],
				d = Math.min(++part._damage,_B_MAX_DAMAGE);

			part.setOpacity(255);
			this.markDamage(part);

			return true;
		}
		return false;
	},

	markDamage: function(part) {
		var d = part._damage;

		part.runAction(cc.tintBy(0.11,d===1?20:0,d===2?20:0,d===3?20:0));
		if( d === 1 ) {
			part.setSpriteFrame(cc.spriteFrameCache.getSpriteFrame(part._shipDamaged));
			part.setRotation(Math.random()*360);
		}
		if( d === _B_MAX_DAMAGE && this._hidden ) {
			var letter = new cc.LabelBMFont( part._letter , "res/fonts/PTMono100Bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
			letter.setPosition(part.getPosition());
			letter.setRotation(this._rotation);
			letter.setScale(0.0);
			letter.runAction(
				cc.scaleTo(0.66,1)	
			);
			this.addChild(letter,10);
		}
	},

	progressDamage: function() {	
		var self = this,
			wl = this._word.length;

		for( var i=0 ; i<wl ; i++ ) {
			var part = this.children[i];
			if( part._damage > 0 && part._damage < _B_MAX_DAMAGE ) {
				setTimeout(function(part) {
					part._damage++;
					self.markDamage(part);
				}, _B_DAMAGE_PROGRESS_DELAY*Math.random()*1000*10, part);
			}
		}
	},
    
    getRect: function() {
    	return this._rect;
    },
    
    destroyShip: function(ship) {
		_b_release(this);
    }
});

// Bomb is the class for bombs
//
// Methods
// -------
//
// Properties
// ----------
//
var Bomb = cc.PhysicsSprite.extend({

	_space: null,
	_sea: null,
	_text: "",
	_clickable: true,
	_dragable: true,
	_bomb: null,
	_shape: null,
	_crosshair: null,
	_timer: null,
	_startTime: null,

	getCrosshair: function() { return this._crosshair; },
	setCrosshair: function(crosshair) { this._crosshair = crosshair; },

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(space, pos, sea) {
        cc.PhysicsSprite.prototype.ctor.call(this);
        
        this._space = space;
		this._sea = sea;

		var frame = cc.spriteFrameCache.getSpriteFrame("bomb.png");
        this.initWithSpriteFrame(frame);
		this.setAnchorPoint(0.50,0.42);
		var radius = 50,
			mass = 30,
			bomb = this._bomb = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0)))),
			circle = this._shape = space.addShape(new cp.CircleShape(bomb, radius, cp.v(0, 0)));
		circle.setElasticity(0.5);
		circle.setFriction(3);		
		circle.setCollisionType(_B_COLL_TYPE_OBJECT);

		this.setBody(bomb);
        this.setPosition(pos);
        //this.setCascadeOpacityEnabled(true);

        var label = this._label = cc.LabelTTF.create(this._text, _b_getFontName(res.indieflower_ttf), 140, cc.size(300,140),cc.TEXT_ALIGNMENT_CENTER, cc.VERTICAL_TEXT_ALIGNMENT_CENTER);
        label.setColor(cc.color(255,255,255));
        label.setOpacity(100);
		label.setPosition(cc.p(60, 46));
		label.setScale(0.7);	
		this.addChild(label,20);
		_b_retain(label,"Bomb: label");	
	
		var crosshair = this._crosshair = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("crosshair.png"),cc.rect(0,0,103,102));
		crosshair.setPosition(cc.p(60,46));
		crosshair.setOpacity(0);
		this.addChild(crosshair,30);
		_b_retain(crosshair,"Bomb: crosshair");	
	
		this.scheduleUpdate();
	},
	
	setTimer: function(seconds) {
		this._timer = seconds;
		this._startTime = new Date().getTime();
	},

	getTimer: function() {
		var now = new Date().getTime(),
			seconds = Math.floor((now - this._startTime)/1000);
	
		return this._timer - seconds;
	},

	dragging: function() {
		var dpos = this.draggingPos;

		if( dpos ) {
			var pos = this.getPosition(),
				seaRect = this._sea && this._sea.getBoundingBox() || null;

			if( seaRect && cc.rectContainsPoint(seaRect, {x:dpos.x, y:dpos.y+_B_CROSSHAIR_Y_OFFSET}) ) {
				if( !this._imIn ) {
					this._imIn = true;
					this.getCrosshair().runAction(cc.fadeIn(0.22));
					this.runAction(cc.fadeOut(0.22));
				}
				dpos.x = Math.floor((dpos.x-seaRect.x)/_B_SQUARE_SIZE)*_B_SQUARE_SIZE + seaRect.x + _B_SQUARE_SIZE/2;
				dpos.y = Math.floor((dpos.y-seaRect.y)/_B_SQUARE_SIZE)*_B_SQUARE_SIZE + seaRect.y + _B_SQUARE_SIZE/2;
			} else {
				if( this._imIn ) {
					this._imIn = false;
					this.getCrosshair().runAction(cc.fadeOut(0.22));
					this.runAction(cc.fadeIn(0.22));
				}
			}

			this.getBody().setVel(cp.v((dpos.x-pos.x)*10,(dpos.y-pos.y+_B_CROSSHAIR_Y_OFFSET)*10));
		}
	},
	
	land: function() {
		var self = this;

		if( !this._imIn ) return;

		var parent = this.getParent();
		
		if( !parent ) return; // I have no sea anymore to land

		var	dpos = this.draggingPos,
			seaRect = this._sea.getBoundingBox(),
			flyingBomb = new FlyingBomb(this._sea, false);
		
		parent.addChild(flyingBomb,20);

		flyingBomb.fire();
		flyingBomb.land(cc.p(dpos.x, dpos.y+_B_CROSSHAIR_Y_OFFSET), function(hit) {
			if( self.getParent() ) {
				if(hit) {	
					var bomb = new Bomb(self._space, cc.p(180,600),self._sea);
					bomb.getBody().applyImpulse(cp.v(30,100),cp.v(300,0));
					bomb.setTimer(self.getTimer());
					parent.addObject(bomb);
				}

				parent.removeChild(flyingBomb);
				self._crossHairStatic = false;
				self.exit();
			}
		});

		cc.audioEngine.playEffect(gRes.bomb_flying_mp3);
		this._crossHairStatic = true;
		self.runAction(
			cc.sequence(
				cc.EaseSineIn.create(
					cc.scaleTo(0.11,0.1)
				),
				cc.EaseSineOut.create(
					cc.scaleTo(0.11,1.1)
				),
				cc.scaleTo(2,0.8)
			)
		);

		$b.sendMessage({ message: "bomb", pos: cc.p(dpos.x-seaRect.x, dpos.y+_B_CROSSHAIR_Y_OFFSET-seaRect.y) });	
	},
	
	update: function(dt) {
		var self = this;
		
		this._renderCmd.setDirtyFlag(cc.Node._dirtyFlags.transformDirty);
		
		if( this._timer ) {
			var now = new Date().getTime(),
				seconds = Math.floor((now - this._startTime)/1000);
		
			var time = this._timer - seconds;
			this._label.setString(time);
			if( time === 0 ) {
				cc.eventManager.dispatchCustomEvent("bomb_time_is_up", this);
				self._timer = null;		
				this._label.setString("");

				// maybe explosion here, some nice tricks ...
				this.exit();
			}
		}

		if( this._crossHairStatic ) {
			this.dragging();
		}
	},
	
	exit: function() {
		this.onExit();
		
		if( this._shape ) this._space.removeShape(this._shape);
		if( this._bomb ) this._space.removeBody(this._bomb);
		this.getParent().removeObject(this);
		this._timer = null;
	}	
});

var FlyingBomb = cc.Sprite.extend({

	_sea: null,
	_incoming: false,

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(sea, incoming) {
        cc.Sprite.prototype.ctor.call(this);
        
        this._sea = sea;
		this._incoming = incoming;

		var frame = cc.spriteFrameCache.getSpriteFrame("bomb.png");
        this.initWithSpriteFrame(frame);
	},

	fire: function() {
		
		this.setPosition(_B_CANONBALL_POS);
		this.runAction(
			cc.EaseSineOut.create(
				cc.moveBy(0.22,cc.p(1200,400))
			)
		);
		
		cc.audioEngine.playEffect(gRes.bomb_flying_mp3);
	},

	land: function(pos, cb) {
		var self = this,
			seaRect = this._sea.getBoundingBox(),
			xStart = seaRect.x + this._incoming?seaRect.width:0,
			distance = Math.abs(pos.x - xStart);

		this.setScale(0.0);

		if( this._incoming ) cc.audioEngine.playEffect(gRes.bomb_flying_mp3);

		this.runAction(
			cc.sequence(
				cc.delayTime(2 - 0.66*distance/seaRect.width),
				cc.spawn(
					cc.moveTo(0.001,cc.p(xStart,pos.y+distance/5)),
					cc.scaleTo(0.001,0.2)
				),
				cc.moveTo(0.66*distance/seaRect.width,pos),
				cc.fadeOut(0.001),
				cc.callFunc(function() {

					// look if we hit a ship ...
					var ships = self._sea.getChildren(),
						hit = false;
					for( var i=0 ; i<ships.length ; i++ ) {
						if( ships[i].dropBomb ) if( hit = ships[i].dropBomb(pos) ) break;
					}
					
					if( hit ) cc.audioEngine.playEffect(gRes.bomb_on_ship_mp3);
					else cc.audioEngine.playEffect(gRes.bomb_in_water_mp3);
					cb(hit);
				})
			)
		);
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

		cc.audioEngine.setEffectsVolume(0.5);
		cc.audioEngine.setMusicVolume(0.5);

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

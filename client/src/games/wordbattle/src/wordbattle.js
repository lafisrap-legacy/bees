// WordBattleLayer Constants
//
var _B_MAX_SHIP_LENGTH = 10,	        // maximum ship length (or size of the sea)
	_B_SQUARE_SIZE = 56,                // size of one square of the playground in pixels
	_B_WORDS_PER_ROUND = 5,	            // max number of words per round
	_B_HOURGLASS_POS = cc.p(668,80),    // Position of hoursglass
	_B_CANON_POS = cc.p(130,280),       // Position of canon
	_B_CANONBALL_POS = cc.p(240,340),   // Startpos of canonball
	_B_CROSSHAIR_Y_OFFSET = _B_SQUARE_SIZE + 7, // Vertical offset of crosshair, that it can be seen above a thumb 
	_B_DAMAGE_PROGRESS_DELAY = 0.1,     // waiting time to make damage processing more interesting
	_B_BIGSHIP_MOVING_SPEED = 190,      // Moving speed of big ships
	_B_MAX_DAMAGE = 4,                  // When is a ship done?
	_B_MAX_SHIP_DAMAGE = 0.85,          // When a ship is damaged by 85% it is drowned
	_B_TAP_TIME = 200                   // Above this time tap becomes a drag.
	_B_NEXT_BIG_SHIP = 1,               // callback mode: the next big ship can com 
	_B_BIG_SHIP_LEFT = 2,               // callback mode: the big ship left the screen
	_B_SEA_SYMBOL_SCALE = 0.1,          // Size of a sea when it is a symbol
    _B_SEA_MOVING_DELAY = 0.9,          // Animation time for seas
    _B_LETTERS_FLYING_DELAY = 6.5,      // Seconds the letters fly
    _B_LETTER_COLOR_NORMAL = cc.color(255,255,0),   // Letter color on ship: normal 
    _B_LETTER_COLOR_WIN = cc.color(0,255,0),        // ... when word was won
    _B_LETTER_COLOR_LOST = cc.color(255,0,0),       // ... when word was lost

// Regular Expressions
//
_b_selectedWords = /\{([\wäöüÄÖÜß]{2,})\}/g;

// WordBattleLayer is the main layer for the word battle game. It contains the two sea playgrounds as cocos2d childs and 
//
// Methods
// -------
// ctor 
// initListener starts touch events of the title layer
// stopListener stops touch events 
//
var WordBattleLayer = cc.Layer.extend({
	_ownSea: [],            // left sea playground with own ships
	_otherSea: [],          // right sea playground with opponents ships
	_squares: [],           // array to mark squares that were hit
	_bombs: [],             // currently active bombs
	_text: null,            // the text of the fairytale organized in paragraphs
	_sphinx: null,          // not used by now
	_fairy: null,           // the layer where fairies appear, bombs are rolling and big ships floating
	_collectedWords: null,  // the words that the player already collected, organized by paragraphs
	_selectedWords: null,   // the words that can be collected, org. by paragraphs 
	_paragraph: null,       // the current paragraph
    _rounds: null,          // the number of rounds
	_round: null,           // the corrent round
	_first: null,           // is this player first? (changes after a round (paragraph))
	_bigShipMoving: false,  // is a big ship on its way
	_playingWinningMusic: undefined, // what kind of music is played right now
	_bigShipQueue: [],      // queue up big ships
	
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // startup function of the layer. It
    // - loads the sprites from cache
    // - connectes the other player
    // - 
    ctor:function (state) {
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
			
			self._first = player.first === "yes"; // which player is starting?
			
            ////////////////////////////
            // Fade out the start screen
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
			// Set up paper document
			var paper = self._paper = new DocumentLayer(self.getParent().variation, self._text, self._collectedWords, {
				type: "Paper", 
				fontSize: 50,
				lineHeight: 64
			});
			self.addChild(paper, 5);

			_b_one(["paragraphs_prepared"], function() {
				self.startEpisode();
			});
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
			cc.log("ERROR: Can't open resource file for "+this.parent().game+"/"+this.getParent().variation);
			cc.director.runScene($b);
		}
		this._text = json.text;
		this._sphinx = json.sphinx;

        ///////////////////////////////
        // Creating fairy layer
		this._fairy = new GameFairy();
        this.addChild(this._fairy,15);
		_b_retain(this._fairy, "Fairy");

        ///////////////////////////////
        // Get collected words from storage and fill up empty paragraphs
		this._collectedWords = state.words;
        for( var i=0 ; i<this._text.length ; i++ ) if( !this._collectedWords[i] ) this._collectedWords[i]=[];

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
    
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// startEpisode starts a play with one paragraph, first looking for this paragraph, creating a play list of selected words
	startEpisode: function() {
		var self = this;

        /////////////////////////////
        // Playing winning music
		cc.audioEngine.setMusicVolume(0.5);
		cc.audioEngine.addMusic(gRes.organizing_intro_mp3,false);
		cc.audioEngine.addMusic(gRes.organizing_loop1_mp3,false);
		cc.audioEngine.addMusic(gRes.organizing_loop2_mp3,false);
		cc.audioEngine.addMusic(gRes.organizing_loop3_mp3,false);
		
        //////////////////////////////
		// Create seas
		var own = self._ownSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1.jpg"),cc.rect(0,0,560,560));
		var other = self._otherSea = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("sea1.jpg"),cc.rect(0,0,560,560));
		_b_retain(own,"WordBattleLayer: sea1");		
		_b_retain(other,"WordBattleLayer: sea2");		
		
        //////////////////////////////
        // Determine paragraph (make a priority list, get the list of the opponent and find out the paragraph to play)
        var pList = this.getPriorityParagraphs();
		$b.sendMessage({ message: "getNextParagraph", pList: pList });
		$b.receiveMessage("getNextParagraph", function(data) {
            var paragraph = self._paragraph = self.getNextParagraph(pList, data.pList);

            //////////////////////////////
            // Show fairy tale 
            self._paper.prepare(paragraph, new MyGameSymbol(own, other, function() {
                self.moveSeasIn(own, other);
            }));
            
            //////////////////////////////
            // Get selected words of current paragraph 
            var p = self._text[paragraph],
                sw = self._selectedWords = [],
                word;

            while( (word=_b_selectedWords.exec(p)) != null ) {
                sw.push(word[1]);
            }
            cc.assert(sw.length, "I didn't find any words in the current paragraph.")
            
            //////////////////////////////
            // Divide the words on different rounds and send it, or wait for the words from the other player
            self._round = 0;
            if( self._first ) {
                var lotteryWheel = [],
                    rounds = [],
                    n = sw.length;
                
                for( var i=0 ; i<n ; i++ ) lotteryWheel.push(i);
                for( var i=0 ; i < Math.floor((n-1)/_B_WORDS_PER_ROUND+1) ; i++ ) rounds.push([]);
                for( var i=0 ; i<n ; i++ ) rounds[i%rounds.length].push(lotteryWheel.splice(parseInt(Math.random()*lotteryWheel.length),1)[0]);
                cc.assert(lotteryWheel.length == 0, "Lottery wheel is not empty.");
                
                self._rounds = rounds;
                _b_one(["seas_have_moved_in"], function() {
                    self.startRound();
                });

                $b.sendMessage({ message: "initRounds", rounds: self._rounds });
            } else {
                $b.receiveMessage("initRounds", function(data) {
                    cc.assert(data.message === "initRounds", "Received wrong message ('"+data.message+"' instead of 'initRounds') while starting episode.");
                    self._rounds = data.rounds;
                    _b_one(["seas_have_moved_in"], function() {
                        self.startRound();
                    });
		    	});
		    }
        });
	},
	
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // startRound starts one round of bomb throwing and bomb receiving, either first throwing or first receiving
	startRound: function(allStrait) {
		var self = this;
		
		var r = this._rounds[this._round],
			own = this._ownSea;  

		this._shipsLeft = r.length; // number of ships still on the battle field
	
        //////////////////////////////
		// Build ships
		for( var i=0; i<r.length ; i++ ) {

            ///////////////////////////////////////////////
            // build ships
			var word = this._selectedWords[r[i]];
			if( word.length > _B_MAX_SHIP_LENGTH ) continue; // don't take words that don't fit ...
			var ship = new Battleship(word, false, this);
			
            //////////////////////////////////////////////
            // add ships to battle field and find a position for them
			own.addChild(ship,10);
			_b_retain(ship,"WordBattleLayer: ship"+i);		
			var rotation = allStrait!==undefined? allStrait : Math.floor(Math.random()*2)*90;
			var coords = ship.findPosition({col:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH),row:Math.floor(Math.random()*_B_MAX_SHIP_LENGTH)},rotation);

			if( !coords ) { // if no place is found start over and set all ships in one direction (avoiding intersections)
                ///////////////////////////////////
                // start over again
				own.removeAllChildren();
				return self.startRound(Math.floor(Math.random()*2)*90);
			}

            //////////////////////////////////////
            // set all attributes of ship and animate them
			ship.setRCPosition(coords);
			ship.setRotation(rotation);
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

        //////////////////////////////
        // Clear squares
        for( var i=0 ; i<_B_MAX_SHIP_LENGTH ; i++ ) self._squares[i] = [];

		this.letShipsBeMoved();
	
		var fairy = this._fairy;
	
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

	endRound: function() {
		var self = this,
			own = this._ownSea,
			other = this._otherSea,
			fairy = this._fairy,
			paper = this._paper;

		_b_clear("damageProgressed");
		$b.stopMessage("ship_destroyed");
			
		fairy.show(1);
		fairy.say(1, 2, _b_t.fairies.end_of_round_1);
		fairy.say(3, 3, _b_t.fairies.end_of_round_2);

		_b_one("in_6_seconds", function() {

			//////////////////////////////////////////////
			// Get fairytale and let letters fly
			var sym = paper.getGameSymbol(),
                seaSize = own.getContentSize(),
                pos = sym.getPosition(),
                box = paper.getBox();

            self.letLettersFly(own);
			paper.show(cc.height - pos.y);
			fairy.hide();

			//////////////////////////////////////////////
			// Let seas fly to game symbol
            pos.y += box.getPosition().y;
			own.runAction(	
				cc.EaseSineIn.create(
                    cc.sequence(
                        cc.spawn(
                            cc.callFunc(function() { sym.runAction(cc.rotateTo(2,0)) }),
                            cc.scaleTo(_B_SEA_MOVING_DELAY*2, _B_SEA_SYMBOL_SCALE),
                            cc.moveTo(_B_SEA_MOVING_DELAY*2, cc.p(pos.x - seaSize.width*_B_SEA_SYMBOL_SCALE/2-4, pos.y )),
                            cc.rotateBy(_B_SEA_MOVING_DELAY*2, 360)
                        ),
                        cc.callFunc(function() {
                            sym.runAction(cc.rotateTo(0.5, _B_GAMESYMBOL_ROTATION))
                        })
                    )
				)
			);

			other.runAction(	
                cc.sequence(
                    cc.EaseSineOut.create(
                        cc.spawn(
                            cc.scaleTo(_B_SEA_MOVING_DELAY*2+0.1, _B_SEA_SYMBOL_SCALE),
						    cc.moveTo(_B_SEA_MOVING_DELAY*2+0.1, cc.p(pos.x + seaSize.width*_B_SEA_SYMBOL_SCALE/2+4, pos.y )),
                            cc.rotateBy(_B_SEA_MOVING_DELAY*2+0.1, 360)
                        )
                    ),
                    cc.callFunc(function() {
                        ///////////////////////////////////////////////
                        // Empty the seas 
                        var parent = own.getParent(),
                            seas = [own, other];
                        for( var sea in seas ) {
                            for( var i=0 ; i<seas[sea].children.length ; i++ ) { 
                                var ship = seas[sea].children[i];
                                if( ship._isShip ) _b_release(ship);
                            }

                            seas[sea].removeAllChildren();
                        }

                        parent.removeChild(own);
                        parent.removeChild(other);
                        
                        paper.getGameSymbol().restore(function() {

                            self.moveSeasIn(own, other);
			                _b_one(["seas_have_moved_in"], function() {
                                if( ++self._round < self._rounds.length ) self.startRound();
                                else self.startEpisode(); // search for next paragraph and start new episode ...
                            });
                        });
                    })
                )
			);
		});
	},

    getPriorityParagraphs: function() {
        var text = this._text,
            cw = this._collectedWords,
            list = [];

        for( var i=0 ; i<text.length ; i++ ) {
            var p = text[i],
                cWords = cw[i] || [],
                sWords = [],
                word;

            while( (word=_b_selectedWords.exec(p)) != null ) {
                sWords.push(word[1]);
            }

            if( cWords.length === 0 ) {
                list.push({paragraph: i, priority: 1});
                continue;
            } else if( cWords.length < sWords.length ) {
                list.push({paragraph: i, priority: 2});
                continue;
            } else {
                for( var j=0, minOpacity=256 ; j<cWords.length ; j++ ) minOpacity = Math.min(minOpacity, cWords[j].opacity);

                if( minOpacity < 255 ) list.push({paragraph: i, priority: 3});
                else list.push({paragraph: i, priority: 4});
            }
        }

        return list.sort(function(a,b) {
            if( a.priority > b.priority ) return 1;
            if( a.priority < b.priority ) return -1;
            if( a.paragraph > b.paragraph ) return 1;
            if( a.paragraph < b.paragraph ) return -1;
 
            return 0;
        });
    },

    getNextParagraph: function(ownPList, otherPList) {
        cc.assert(ownPList.length === otherPList.length, "Number of paragraphs not matching.");
        
        var jointList = [];

        for( var i=0 ; i<ownPList.length ; i++ ) {
            var own = ownPList[i],
                other = otherPList[i];
            jointList[own.paragraph] = (jointList[own.paragraph] || 0) + i;
            jointList[other.paragraph] = (jointList[own.paragraph] || 0) + i;
        }

        cc.assert(jointList.length === ownPList.length, "Didn't find all paragraphs in paragraph lists.");

        var pMin = 10000,
            p = 0;
        for( var i=0 ; i<jointList.length ; i++ ) {
            if( pMin > jointList[i]) {
                pMin = jointList[i];
                p = i;
            }
        }

        return p;
    },

    moveSeasIn: function(own, other) {
        var parent = own.getParent(),
            pos1 = parent.convertToWorldSpace(own.getPosition()),
            pos2 = parent.convertToWorldSpace(other.getPosition());

        parent.removeChild(own);
        parent.removeChild(other);
        this.addChild(own, 10);
        this.addChild(other, 10);
        own.setPosition(this.convertToNodeSpace(pos1));
        other.setPosition(this.convertToNodeSpace(pos2));

        own.runAction(
            cc.EaseSineOut.create(
                cc.spawn(
                    cc.scaleTo(_B_SEA_MOVING_DELAY, 1),
                    cc.rotateTo(_B_SEA_MOVING_DELAY, 0),
                    cc.moveTo(_B_SEA_MOVING_DELAY, cc.p(284,cc.height/2))
                )
            )
        );
        other.runAction(
            cc.sequence(
                cc.EaseSineIn.create(
                    cc.spawn(
                        cc.scaleTo(_B_SEA_MOVING_DELAY + 0.1, 1),
                        cc.rotateTo(_B_SEA_MOVING_DELAY + 0.1, 0),
                        cc.moveTo(_B_SEA_MOVING_DELAY + 0.1, cc.p(852,cc.height/2))
                    )
                ),
                cc.callFunc(function() {
                    cc.eventManager.dispatchCustomEvent("seas_have_moved_in");		
                })
            )
        );

        //////////////////////////////
        // Play winning music! 
        cc.audioEngine.setMusicVolume(0.5);
        cc.audioEngine.playMusic(gRes.organizing_intro_mp3,false);
        cc.audioEngine.addMusic(gRes.organizing_loop1_mp3,true);
        cc.audioEngine.addMusic(gRes.organizing_loop2_mp3,true);
        cc.audioEngine.addMusic(gRes.organizing_loop3_mp3,true);
    },

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
			
				if( tile._isShip ) {
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
					var ship = new Battleship(tile.word, true, self);
					other.addChild(ship,10);
					_b_retain(ship,"WordBattleLayer: other ship"+i);		
					ship.setRCPosition(tile.coords);
					ship.setRotation(tile.rotation);							
				}

				cc.audioEngine.fadeOut(2);
				setTimeout(function() {
					cc.audioEngine.stopAllMusic();
				}, 2000);
				
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

		// start always with three bombs and one typewriter
		for( var i=0 ; i<3 ; i++ ) {	
			self._bombs[i] = new Bomb(fairy, cc.p(-60+90*i+(i%2)*Math.random()*50,300+(i%2)*100),self._otherSea, function(pos) {
				if( typewriter ) {
					typewriter.exit();
					typewriter = null;
				}
			});
			self._bombs[i].getBody().applyImpulse(cp.v(30,100),cp.v(i*300,0));
			fairy.addObject(self._bombs[i]);
		}

		var afterTyping = function(ship, word) {
		    if( word == "" ) {
				return;
			}

			// get rid of type writer
			typewriter.exit();
			typewriter = null;

			cc.log("Check if word is correct ...");
			// check if word is correct
			if(ship.getWord().toLowerCase() === word.toLowerCase()) {
			    cc.log("Word is correct.");
				ship.setFullDamage();
				cc.audioEngine.playMusic(gRes.textright_mp3,false);
				fairy.show(6);
				fairy.say(0, 4, _b_t.fairies.word_won);
				setTimeout(function() {
					fairy.hide();
				}, 4500)
					
			} else {
			    cc.log("Word is not correct. Right would be: "+ship.getWord());
				// word wrong: let all bombs explode
				cc.audioEngine.playMusic(gRes.textwrong_mp3,false);
				fairy.eachObject(function(i, obj) { 
					obj.setTimer(0);
				});
				fairy.show(6);
				fairy.say(0, 4, _b_t.fairies.word_lost);
				_b_pause(); // wait with execution of next event until _b_resume() is called
				setTimeout(function() {
					_b_resume();
					fairy.hide();
				}, 4500)
			}
		},
		typewriter;

		setTimeout(function() {
		    typewriter = new TypeWriter(fairy, cc.p(-50,450), self._otherSea, afterTyping);
		    fairy.addObject(typewriter);
		}, 1000);

		var canon = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("canon.png"),cc.rect(0,0,260,284)),
			canonAction = cc.EaseSineOut.create(cc.moveTo(1.66, _B_CANON_POS));

		canon.setPosition(cc.p(_B_CANON_POS.x-130,_B_CANON_POS.y));
		fairy.addChild(canon,30);
		_b_retain(canon,"Canon");
		canon.runAction(canonAction);

		_b_one("in_2_seconds" , function() {
			hg.hide(function() {
				hg.exit();
				self.removeChild(hg);
				_b_release(hg);
				self._hourglass = null;
			});
			fairy.hide();

			for( var i=0 ; i<3 ; i++ ) {	
				self._bombs[i].setTimer(20);
			}

			_b_one(["last_object_gone","bomb_time_is_up"], function() {
			
				cc.log("Last object gone ...");
				if( typewriter ) {
					typewriter.exit();
					typewriter = null;
				}

				fairy.show(3);
				fairy.say(0, 99, _b_t.fairies.ceasefire);

				canon.runAction(
					cc.sequence(
						cc.moveBy(1.66, cc.p(-260,0)),
						cc.callFunc(function() {
							fairy.removeChild(canon);
							_b_release(canon);
						})
					)
				);

				cc.log("Sending ceasefire ...");
				$b.sendMessage({ message: "ceasefire" });
				$b.receiveMessage("ceasefire", function(data) {
					cc.log("Receiving ceasefire ...");

					$b.stopMessage("bomb");
					cc.log("Don't wait for bombs any more.");
					_b_one("in_4_seconds", function() {
						fairy.silent();
						fairy.show(4);
						fairy.say(0, 3, _b_t.fairies.results);
					
						cc.log("Announcing results ...");
						_b_one("in_1_seconds", function() {
							var own = self._ownSea.getChildren(),
								other = self._otherSea.getChildren();

							cc.log("Progressing damage ...");
							var progressDamage = function(ships, isOwnSea) {
								var i=0,
									shipSunk = false,
									interval = setInterval(function() {
										while( i < ships.length && !ships[i]._isShip ) i++; 
										if( i < ships.length ) {
											if( ships[i].progressDamage() ) {
												shipSunk = true; // ships can only sink in other sea, in own sea a ship_destroyed message is received
											}
										}
										if( ++i >= ships.length ) {
											clearInterval(interval);
											
											if( !shipSunk ) {
												_b_one("in_3_seconds", function(){
													if( !self._bigShipMoving ) cc.eventManager.dispatchCustomEvent("last_big_ship_left", self);
												});
											}
											
											_b_one("last_big_ship_left", function() {
												 cc.eventManager.dispatchCustomEvent("damageProgressed", self);
											});
										}
									}, _B_DAMAGE_PROGRESS_DELAY*1000);
							};

							progressDamage(own,true);
							progressDamage(other,false);
							
							_b_one("damageProgressed", function() {

								cc.log("Damage is progressed!");
								$b.sendMessage({ message: "damageProgressed" });
								$b.receiveMessage("damageProgressed", function() {

									fairy.say(0, 3, _b_t.fairies.ready);

									_b_one("in_1_seconds", function() {
										
										var hg = self._hourglass = new Hourglass(self._fairy._space, _B_HOURGLASS_POS);
										self.addChild(self._hourglass,10);
										_b_retain(self._hourglass, "Hourglass");
										hg.show();
										fairy.show(5);
										fairy.say(2,3, _b_t.fairies.press_it);
										cc.log("Waiting for hourglass to be clicked ...");

										_b_one("hourglass_is_clicked", function() {
											cc.log("Hourglass is clicked! Sending message to start round ...");
											$b.sendMessage({ message: "playRound" });

											hg.getBody().applyImpulse(cp.v(0,60000),cp.v(0,0));
											fairy.hide();
											$b.receiveMessage("playRound", function() {
												cc.log("Got message to play round!!");
												$b.stopMessage("ship_destroyed");
												self.playRound();
											});
										});
									});
								});
							});

							(function receiveShipDestroyed() {
								$b.receiveMessage("ship_destroyed", function(data) {
									var word = data.word,
										ownShip = self._ownSea.getChildByName(word),
										otherShip = self._otherSea.getChildByName(word);

									cc.assert(ownShip, "I wanted to show a word on a lost ship, but didn't find it.");
                                    if( !ownShip._shipWon ) ownShip._shipWon = false;
									ownShip.moveBigShip(false, function() {
										if( !ownShip.showWord(false) && --self._shipsLeft === 0 ) self.endRound(); 

										if( otherShip && otherShip.getParent() ) {
											otherShip.destroyShip(true);
											otherShip.getParent().removeChild(otherShip);
											_b_release(otherShip);
										}
									});

									receiveShipDestroyed();
								});
							})();
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
					_b_retain(flyingBomb,"WordBattleLayer: Flying Bomb");		

					flyingBomb.land(cc.p(seaRect.x+pos.x, seaRect.y+pos.y), function(hit) {
						fairy.removeChild(flyingBomb);
						_b_release(flyingBomb);
					});

					receiveBomb();
				});
			})();
		});
	},

	letLettersFly: function(own) {
		var self = this,
			ships = own.children,
			paper = this._paper;

		for( var i=0 ; i<ships.length ; i++ ) {
			var ship = ships[i],
				parts = ship.children,
				word = paper.getWord(ships[i]._word),
				box = paper.getBox();

			if( ship._isShip ) {
				var wordPos = word.label.getPosition(),
					letterSpace = word.label.width / word.plain.length;

                if( ship._shipWon === true ) {
                    word.opacity = 255;
                    word.color = cc.color(222,0,0);
                } else {
                    word.opacity = Math.min(word.opacity + 51, 255);
                    word.color = cc.color(224,208,160);
                }

                this._collectedWords[this._paragraph].push({ 
                    plain: word.plain, 
                    color: word.color, 
                    opacity: word.opacity 
                });
				
				for( var j=0 ; j<parts.length ; j++ ) {
					var part = parts[j];
						letter = part._letterSprite;
					if( letter ) {
						var pos = ship.convertToWorldSpace(letter.getPosition());
						ship.removeChild(letter);
						letter.setPosition(pos);
						letter.setScale(0.5);
						letter.setRotation(0);
						this.addChild(letter);
						letter.runAction(
							cc.sequence(
								cc.EaseSineOut.create(
									cc.scaleTo(_B_SEA_MOVING_DELAY,1)
								),
								cc.callFunc(function(obj, data) {
									var letter = data.letter,
										pos1 = self.convertToWorldSpace(letter.getPosition()),
										pos2 = data.pos;

									self.removeChild(letter);

                                    var pos1 = box.convertToNodeSpace(pos1),
										bezier = [
											pos1,	
											cc.p(pos2.x < cc.width/2? cc.width*0.75 + Math.random()*100 : cc.width*0.25 - Math.random()*100, 
                                                 pos1.y + (pos2.y>pos1.y? -50 - Math.random()*50 : 50 + Math.random()*50)),
											pos2
										];

									letter.setPosition(pos1);
									box.addChild(letter,20);

									letter.runAction(
                                        cc.sequence(
                                            cc.EaseSineOut.create(
                                                cc.spawn(
                                                    cc.bezierTo(_B_LETTERS_FLYING_DELAY, bezier),
                                                    cc.scaleTo(_B_LETTERS_FLYING_DELAY, 0.4),
                                                    cc.fadeTo(_B_LETTERS_FLYING_DELAY, 40),
                                                    cc.rotateBy(_B_LETTERS_FLYING_DELAY,1080)
                                                )
                                            ),
                                            cc.callFunc(function() {
                                                box.removeChild(letter);
                                                _b_release(letter);
                                            })
                                        )
									);
								}, self, {letter: letter, pos:cc.p(wordPos.x - word.label.width/2 + letterSpace*j, wordPos.y)})
							)
						);
					}
				}

                setTimeout(function(word) {
                    paper.insertWordIntoParagraph(word);
                }, (_B_SEA_MOVING_DELAY + _B_LETTERS_FLYING_DELAY - 1.5)*1000, word);
            }
		}

		$b.saveState(); 		
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
			swallowTouches: true,
			onTouchesBegan: function(touches, event) {
				var touch = touches[0],
				start = touch.getLocation();
				startTime = new Date().getTime();
				
				// Player taps on a ship in his own see?
				if( !draggedShip ) {
					cc.log("Looking for ship to drag or turn ...");
					var ships = self._ownSea.getChildren();
					for( var i=0 ; i<ships.length ; i++ ) {
						if( !ships[i]._isShip ) continue;

						var rect = ships[i].getRect && ships[i].getRect() || cc.rect(0,0,0,0),
							pos = ships[i].getPosition(),
							tp = cc.p(start.x - rect.x, start.y - rect.y);

						if( tp.x >= 0 && tp.x< rect.width && tp.y >=0 && tp.y<rect.height ) {
							draggedShip = ships[i];
							offset = {
								x: start.x - pos.x,
								y: start.y - pos.y
							};
							return true;
						} 
					}		
				}

				return false;
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

	checkSquare: function(pos) {
		var sea = this._otherSea,
	   		seaRect = sea.getBoundingBox(),
			col = Math.floor((pos.x - seaRect.x)/_B_SQUARE_SIZE),
			row = Math.floor((pos.y - seaRect.y)/_B_SQUARE_SIZE);

		if( !this._squares[row][col] ) {
			this._squares[row][col] = true;

			var checkX = col * _B_SQUARE_SIZE+_B_SQUARE_SIZE/2,
				checkY = row * _B_SQUARE_SIZE+_B_SQUARE_SIZE/2,
				check = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("check.png"),cc.rect(0,0,_B_SQUARE_SIZE,_B_SQUARE_SIZE));

			check.setPosition(cc.p(checkX, checkY));
			check.setScale(0);
			sea.addChild(check,10);

			check.runAction(
				cc.spawn(
					cc.scaleTo(0.33,1,1),
					cc.fadeTo(0.33,100)
				)
			);
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
	_isShip: true,
	_battleLayer: null,
	
	ctor: function(word, hidden, layer) {
	
	    cc.assert( word && word.length >=2 && word.length <= _B_MAX_SHIP_LENGTH , word+" is too short or too long. I need a word with a length between 2 and "+_B_MAX_SHIP_LENGTH );
    	
		this._super();
		
		this._word = word;
		this._hidden = hidden;
		this._battleLayer = layer;
		this.buildShip();	
		this.setName(word);

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
		var topUp = Math.random()>0.5? true:false,
			sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(topUp?"ship1_front.png":"ship1_back.png"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2));
		sprite._shipDamaged = topUp?"ship1_front_damaged.png":"ship1_back_damaged.png";
		sprite._shipOk = topUp?"ship1_front.png":"ship1_back.png";
		sprite.setFlippedY(topUp? false:true);
		this.addChild(sprite);
		for( var i=1 ; i<wl-1 ; i++ ) {
			var shipPart = parseInt(Math.random()*3+1),
				sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("ship1_middle"+shipPart+".png"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2));
			sprite._shipDamaged = "ship1_middle"+shipPart+"_damaged.png";
			sprite._shipOk = "ship1_middle"+shipPart+".png";
			this.addChild(sprite);
		}
		var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(topUp?"ship1_back.png":"ship1_front.png"),cc.rect(0,0,_B_SQUARE_SIZE*2,_B_SQUARE_SIZE*2));
		sprite._shipDamaged = topUp?"ship1_back_damaged.png":"ship1_front_damaged.png";
		sprite._shipOk = topUp?"ship1_back.png":"ship1_front.png";
		sprite.setFlippedY(topUp? false:true);
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

			_b_retain(part,"WordBattleLayer: ship part "+i);		
		}
		
		this.setScale(0.50);
    },

	destroyShip: function(check) {
		for( var i=0 ; i<this.children.length ; i++ ) {
			var part = this.children[i];

			if( check ) this._battleLayer.checkSquare(this.convertToWorldSpace(part.getPosition()));

			_b_release(this.children[i]);
		}
		this.removeAllChildren();
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

			if( !part._letterSprite ) {
				part.setOpacity(255);
				this.markDamage(part);
				this.letItBurn(part);
				this.explode(part);
				return true;
			}
		}
		return false;
	},

	getLetterAtPosition: function(pos) {
		var rect = this._rect;
		if( cc.rectContainsPoint(rect, pos) ) {
			var col = Math.floor((pos.x-rect.x)/_B_SQUARE_SIZE),
				row = Math.floor((pos.y-rect.y)/_B_SQUARE_SIZE),
				i = this._rotation===0? this._word.length-row-1 : col,
				part = this.children[i];

			if( part._damage > 0 ) return part._letter;
			else return null;
		}
		return null;
	},

	markDamage: function(part) {
		var d = part._damage;

		part.runAction(cc.tintBy(0.11,-40,-40,-40));
		if( d === 1 ) {
			part.setSpriteFrame(cc.spriteFrameCache.getSpriteFrame(part._shipDamaged));
			part.setRotation(Math.floor(Math.random()*4)*90);
		}

		if( d === _B_MAX_DAMAGE && this._hidden ) {
			var letter = new cc.LabelBMFont( part._letter , "res/fonts/ErikaOrmig114.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
			//var letter = new cc.LabelBMFont( part._letter , "res/fonts/PTMono100Bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
			letter.setPosition(part.getPosition());
			letter.setRotation(this._rotation);
			letter.setScale(0.0);
            letter.setColor(_B_LETTER_COLOR_NORMAL);
			letter.runAction(
				cc.scaleTo(0.66,1)	
			);
			this.addChild(letter,10);
			_b_retain(letter, "Letter '"+part._letter+"' of word '"+this._word+"'");
			_b_retain(letter, "Small letter on ship part: "+part._letter);
			part._letterSprite = letter;
		}
	},

	letItBurn: function(part) {
		var d = part._damage,
			em = part._emitter;

		if( em ) {
			em.stopSystem();
			setTimeout(function(em) {
				part.removeChild(em);
				cc.log("Releasing emitter "+em._retainId+" on letter "+part._letter+".");
				_b_release(em);
				//em.destroyParticleSystem();
			},2000,em);
		}

		if( d < 1 || d > 3 ) return;
	
		var	emRes = gRes[(d===1? "smoke" : d===2? "smokefire": "fire") + "_plist"],
			rotation = 90-part.getRotation()-(90-this.getRotation()),
			offset = rotation === 0? {x:1,y:2} : 
					 rotation === 90? {x:2,y:1} :
					 rotation === 180? {x:1,y:2/3} :
					 rotation === 270? {x:2/3,y:1} : null;
		//cc.assert( offset, "Rotation must be one of 0, 90, 180, 270. It is "+rotation);
		offset = {x:1,y:1};
		em = part._emitter = new cc.ParticleSystem( emRes );
		em.setPosition(cc.p(_B_SQUARE_SIZE/offset.x, _B_SQUARE_SIZE/offset.y));
		em.setRotation(rotation);
        em.setScale(1.5);
		part.addChild(em);
		_b_retain(em, "Emitter");
	},

	explode: function(part) {
		var emRes = gRes["explosion_plist"],
			em = new cc.ParticleSystem( emRes );

		em.setPosition(cc.p(_B_SQUARE_SIZE, _B_SQUARE_SIZE));
		em.setScale(1.5);
		part.addChild(em);
		_b_retain(em, "Explosion emitter");
		setTimeout(function() {
			part.removeChild(em);
			_b_release(em);
			//em.destroyParticleSystem();
		}, 1000);
	},

	setFullDamage: function() {
		var self = this,
			wl = this.getLength();

		for( var i=0 ; i<wl ; i++ ) {
			var part = this.children[i];
			
			if( part._damage === 0 ) { 
				part.setOpacity(255);
				part.setColor(cc.color(200,200,200,255));
				part.setRotation(Math.random()*360);
				part.setSpriteFrame(cc.spriteFrameCache.getSpriteFrame(part._shipDamaged));
			}

			part._damage = _B_MAX_DAMAGE;
			this.markDamage(part);
			this.letItBurn(part);
		}
	},

	progressDamage: function() {	
		var self = this,
			wl = this.getLength();

		for( var i=0 ; i<wl ; i++ ) {
			var part = this.children[i];
			if( part._damage > 0 && part._damage < _B_MAX_DAMAGE ) {
				part._damage++;
				self.markDamage(part);
				self.letItBurn(part);
			}
		}

		if( self.totalDamage() > _B_MAX_SHIP_DAMAGE && self._hidden ) {
			var	battleLayer = self._battleLayer;

			// get rid of ship in a nice way... (to do)

			// show letter
			for( var i=0 ; i<wl ; i++ ) {
				var part = self.children[i],
					pos = self.convertToWorldSpace(part.getPosition()),
					//letter = new cc.LabelBMFont( part._letter , "res/fonts/PTMono280Bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
					letter = new cc.LabelBMFont( part._letter , "res/fonts/ErikaOrmig280.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
					bezier = [
						cc.p(pos.x, pos.y),	
						cc.p(cc.width*0.60, pos.y+250+i*50),
						cc.p(cc.width+200, -50+i*150)
					];

				letter.setPosition(pos);
				letter.setScale(110/280/2);
				letter.runAction(
					cc.sequence(
						cc.delayTime(i*0.1),
						cc.EaseSineOut.create(
							cc.spawn(
								cc.bezierTo(3.5,bezier),
								cc.rotateBy(3.5,-360+Math.random()*720),
								cc.scaleTo(3.5,1),
								cc.tintBy(3.5,-150,0,-150)
							)
						),
						cc.callFunc(function(letter) {
							battleLayer.removeChild(letter);
							_b_release(letter);
						},letter)
					)
				);

				var sprite = part._letterSprite;
				if( sprite ) {
					self.removeChild(sprite);
					_b_release(sprite);
				}
				battleLayer.addChild(letter,20);
				_b_retain(letter, "Big letter: "+part._letter);
			}

			//////////////////////////////////////////
			// Move big ship after letters have vanished
			setTimeout(function() {
				self.moveBigShip(true, function() {
					var own = battleLayer._ownSea,
						ship = own.getChildByName(self._word);
					cc.assert(ship, "I wanted to show a word on a won ship, but didn't find it.");
                    ship._shipWon = true;
					if( !ship.showWord(true) && --battleLayer._shipsLeft === 0 ) battleLayer.endRound(); 
				});

				// Get rid of old ship in this sea
				if( self.getParent() && self.getParent().getChildByName(self._word) ) {
					self.destroyShip(true);
					self.getParent().removeChild(self);
					_b_release(self);
				}
			}, 2500);

			// Tell it to the other side, what happend
			$b.sendMessage({ message: "ship_destroyed", word: self._word });

			return true;
		}

		return false;
	},

	moveBigShip: function(win, cb) {
		var	self = this,
			battleLayer = this._battleLayer;

		// Show big ship
		var bigShip = new BigBattleShip(self._word, win);

		battleLayer.addChild(bigShip,50);
		_b_retain(bigShip, "Big Ship '"+self._word+"'");
		if( !battleLayer._bigShipMoving ) {
			(function bigShipMove(bigShip) {
				var lastShip = false;
				battleLayer._bigShipMoving = true;

				cc.audioEngine.setMusicVolume(0.5);
				if( bigShip.win && !battleLayer._playingWinningMusic) {
					cc.audioEngine.fadeOut(1, function() {
						cc.audioEngine.stopAllMusic();
						cc.audioEngine.setMusicVolume(0.5);
						cc.audioEngine.addMusic(gRes.organizing_intro_mp3,false);
						cc.audioEngine.addMusic(gRes.organizing_loop1_mp3,false);
						cc.audioEngine.addMusic(gRes.organizing_loop2_mp3,false);
						cc.audioEngine.addMusic(gRes.organizing_loop3_mp3,false);
						cc.audioEngine.addMusic(gRes.organizing_loop1_mp3,false);
						cc.audioEngine.addMusic(gRes.organizing_loop2_mp3,false);
						cc.audioEngine.addMusic(gRes.organizing_loop3_mp3,false);
						battleLayer._playingWinningMusic = true;
					});
				} else if( !bigShip.win && battleLayer._playingWinningMusic !== false ) {
					cc.audioEngine.fadeOut(1, function() {
						cc.audioEngine.stopAllMusic();
						cc.audioEngine.setMusicVolume(0.5);
						cc.audioEngine.addMusic(gRes.shiplost_intro_mp3,false);
						cc.audioEngine.addMusic(gRes.shiplost_loop_mp3,false);
						cc.audioEngine.addMusic(gRes.shiplost_loop_mp3,false);
						cc.audioEngine.addMusic(gRes.shiplost_loop_mp3,false);
						cc.audioEngine.addMusic(gRes.shiplost_loop_mp3,false);
						cc.audioEngine.addMusic(gRes.shiplost_loop_mp3,false);
						cc.audioEngine.addMusic(gRes.shiplost_loop_mp3,false);
						battleLayer._playingWinningMusic = false;
					});
				}
				
				bigShip.ship.move(bigShip.win, function(e) {
					var q = battleLayer._bigShipQueue;
					if( e === _B_NEXT_BIG_SHIP ) {
						// look if other big ships are waiting in line
						if( q.length ) {
							bigShipMove(q.splice(0,1)[0]);
						} else {
							lastShip = true;
						}
					} else if( e === _B_BIG_SHIP_LEFT ) {
						// get rid of ship when it left the display
						battleLayer._bigShipMoving = false;
						battleLayer.removeChild(bigShip.ship);
						_b_release(bigShip.ship);

						if( typeof bigShip.cb === "function" ) bigShip.cb();

						if( lastShip ) {
							cc.eventManager.dispatchCustomEvent("last_big_ship_left");
							cc.audioEngine.fadeOut(2);
							setTimeout(function() {
								cc.audioEngine.stopAllMusic();
							}, 2000);
						}
					}
				});
			})({ship:bigShip, win:win, cb:cb});
		} else {
			battleLayer._bigShipQueue.push({ship:bigShip, win:win, cb:cb});
		}
	},	

	totalDamage: function() {
		var wl = this.getLength(),
			d = 0;

		for( var i=0 ; i<wl ; i++ ) d += this.children[i]._damage;

		return d / wl / _B_MAX_DAMAGE;
	},

	showWord: function(win) {
		var wl = this._word.length,
			mixed = false;

		for( var i=0 ; i<wl ; i++ ) {
			var part = this.children[i],
				tint = win? cc.tintBy(0.66,-150,0,-150) : cc.tintBy(0.66,0,-150,-150);

			if( !part._letterSprite ) {
			    part.setRotation(0);
				if( win ) {
					part.setSpriteFrame(cc.spriteFrameCache.getSpriteFrame(part._shipOk));
					part.setColor(cc.color(255,255,255,255));
				} else {	
					part.setColor(cc.color(160,160,160,255));
				}

				//var letter = new cc.LabelBMFont( part._letter , "res/fonts/PTMono100Bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
				var letter = new cc.LabelBMFont( part._letter , "res/fonts/ErikaOrmig114.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );

				letter.setPosition(part.getPosition());
				letter.setRotation(this._rotation);
				letter.setScale(0.0);
				letter.runAction(
					cc.spawn(
						cc.scaleTo(0.66,1),
						tint
					)
				);
				this.addChild(letter,10);
				_b_retain(letter, "Small letter on ship part: "+part._letter);
				part._letterSprite = letter;
			} else {
				mixed = true;
				if( i%2 ) {
					part._letterSprite.setColor(cc.color(255,255,255,255));
					part._letterSprite.runAction(tint);
				}
			}
		}

		return mixed;
	},
    
    getRect: function() {
    	return this._rect;
    },    
});


// BigBattleShip is the class for the ship carrying the won word
//
// Methods
// -------
//
// Properties
// ----------
//
var BigBattleShip = cc.Node.extend({
	
	ctor: function(word, win) {

	    cc.assert( word && word.length >=2 && word.length <= _B_MAX_SHIP_LENGTH , word+" is too short or too long. I need a word with a length between 2 and "+_B_MAX_SHIP_LENGTH );
    	
		this._super();
		
		this.buildShip(word, win);	
		this.width = (2+Math.floor((word.length-1)/2))*350;
		this.height = 350;
		this.setPosition(cc.p(win? 1136+this.width/2+50 : 0-this.width/2-50, 130));
	},

	buildShip: function(word, win) {
		var wl = word.length,
			sl = 2+Math.floor((wl-1)/2);

		// create the sprites and add them to the node		
		var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("bigship_"+(win?"front":"back")+".png"),cc.rect(0,0,350,350));
		this.addChild(sprite);
		for( var i=1 ; i<sl-1 ; i++ ) {
			var shipPart = parseInt(Math.random()*3+1),
				sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("bigship_middle"+shipPart+".png"),cc.rect(0,0,350,350));
			this.addChild(sprite);
		}
		var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("bigship_"+(win?"back":"front")+".png"),cc.rect(0,0,350,350));
		this.addChild(sprite);

		// set positions of ship parts
		for( var i=0 ; i<sl ; i++ ) {
			var part = this.children[i];
			part.setPosition(cc.p((i-sl/2)*350 + 175,0));
			part.setFlippedX(win? false:true);
		}

		// set postitios of letters
		for( var i=0 ; i<wl ; i++ ) {
			//var letter = new cc.LabelBMFont( word[i] , "res/fonts/PTMono280Bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
			var letter = new cc.LabelBMFont( word[i] , "res/fonts/ErikaOrmig280.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
			letter.setPosition(cc.p((i-wl/2)*175 + 87.5,60));
			if( win ) letter.setColor(_B_LETTER_COLOR_WIN);
			else letter.setColor(_B_LETTER_COLOR_LOST);
			this.addChild(letter,10);
		}
    },

	move: function(win, cb) {
		this.setPosition(cc.p(win? 1136+this.width/2+50 : -this.width-50, 130));
		this.runAction(
			cc.sequence(
				cc.moveTo(this.width/_B_BIGSHIP_MOVING_SPEED, cc.p(win? 1136-this.width/2-50 : this.width/2+50, 130)),
				cc.callFunc(function() {
					if(typeof cb === "function") cb(_B_NEXT_BIG_SHIP);
				}),
				cc.moveTo(1136/_B_BIGSHIP_MOVING_SPEED, cc.p(win? -this.width/2-50 : 1136+this.width/2+50, 130)),
				cc.callFunc(function() {
					if(typeof cb === "function") cb(_B_BIG_SHIP_LEFT);
				})
			)
		);
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
	_pauseTime: null,
	_finalCallback: null,

	getCrosshair: function() { return this._crosshair; },
	setCrosshair: function(crosshair) { this._crosshair = crosshair; },

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(parent, pos, sea, cb) {
        cc.PhysicsSprite.prototype.ctor.call(this);
        
		cc.assert(parent._space, "Parent must have a chipmunk space attibute.");
        this._space = parent._space;
		this._sea = sea;
		this._finalCallback = cb;

		var frame = cc.spriteFrameCache.getSpriteFrame("bomb.png");
        this.initWithSpriteFrame(frame);
		this.setAnchorPoint(0.50,0.42);
		var radius = 50,
			mass = 60,
			bomb = this._bomb = this._space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0)))),
			circle = this._shape = this._space.addShape(new cp.CircleShape(bomb, radius, cp.v(0, 0)));
		circle.setElasticity(0.1);
		circle.setFriction(1.5);		
		circle.setCollisionType(_B_COLL_TYPE_OBJECT);

		this.setBody(bomb);
        this.setPosition(pos);

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
		this._startTime = new Date().getTime() / 1000;
	},

	getTimer: function() {
		var now = new Date().getTime() / 1000;
	
		return this._startTime - now + this._timer;
	},

	pauseTimer: function() {
		this._pauseTime = this.getTimer();
	},

	resumeTimer: function() {
		if( this._pauseTime === null ) return;

		this.setTimer(this._pauseTime);
		this._pauseTime = null;
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
	
	land: function(cb) {
		var self = this,
			parent = this.getParent();	

		// if not over a sea or not attached to one, leave ...
		if( !this._imIn || !parent ) {
			if( typeof cb === "function" ) cb();
			return;
		}

		var	dpos = this.draggingPos,
			seaRect = this._sea.getBoundingBox();

		if( seaRect && cc.rectContainsPoint(seaRect, {x:dpos.x, y:dpos.y+_B_CROSSHAIR_Y_OFFSET}) ) {

			var	flyingBomb = new FlyingBomb(this._sea, false);
				
			parent.addChild(flyingBomb,20);
			_b_retain(flyingBomb,"WordBattleLayer: Flying Bomb");		

			flyingBomb.fire(function() {
				flyingBomb.land(cc.p(dpos.x, dpos.y+_B_CROSSHAIR_Y_OFFSET), function(hit) {
					if( self.getParent() ) {
						if(hit) {	
							var bomb = new Bomb(parent, cc.p(-90,300),self._sea);
							bomb.getBody().applyImpulse(cp.v(30,100),cp.v(300,0));
							bomb.setTimer(self.getTimer());
							parent.addObject(bomb);
						}

						parent.removeChild(flyingBomb);
						_b_release(flyingBomb);
						self._crossHairStatic = false;
						self.exit();
						if( typeof cb === "function" ) cb();
					}
				});
			});

			cc.audioEngine.playEffect(self._incoming? gRes.other_bomb_flying_mp3 : gRes.own_bomb_flying_mp3);
			self._crossHairStatic = true;
			self.runAction(
				cc.sequence(
					cc.EaseSineIn.create(
						cc.scaleTo(0.11,0.1)
					),
					cc.EaseSineOut.create(
						cc.scaleTo(0.11,1.1)
					),
					cc.scaleTo(3,0.7)
				)
			);

			var pos = cc.p(dpos.x-seaRect.x, dpos.y+_B_CROSSHAIR_Y_OFFSET-seaRect.y);
			$b.sendMessage({ message: "bomb", pos: pos });
			if( typeof self._finalCallback === "function" ) self._finalCallback(pos);
		} else {
			this._imIn = false;
			this.getCrosshair().runAction(cc.fadeOut(0.22));
			this.runAction(cc.fadeIn(0.22));
			if( typeof cb === "function" ) cb();
		}
	},
	
	containsPoint: function(point) {
		var pos = this.getPosition();

		if( cp.v.dist(pos, point) < this.width/2 ) return true;
		else return false;
	},

	update: function(dt) {
		var self = this;	
		
		if( this._timer !== null && !this._pauseTime ) {
			var now = new Date().getTime() / 1000,
				time = Math.floor(this._startTime - now + this._timer);
		
			if( time >= 0 ) {
				this._label.setString(time);
			} else {
				cc.eventManager.dispatchCustomEvent("bomb_time_is_up", this);
				self._timer = null;		
				this._label.setString("");

				// maybe explosion here, some nice tricks ...
				this.exit();
			}
			this._renderCmd.setDirtyFlag(cc.Node._dirtyFlags.transformDirty);
		}

		if( this._crossHairStatic ) {
			this.dragging();
		}
	},
	
	exit: function() {
		this.onExit();
		
		if( this._shape ) this._space.removeShape(this._shape);
		if( this._bomb ) this._space.removeBody(this._bomb);
		this.unscheduleUpdate();
		_b_release(this._label);	
		_b_release(this._crosshair);	
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

	fire: function(cb) {
		
		this.setPosition(_B_CANONBALL_POS);
		this.runAction(
			cc.sequence(
				cc.EaseSineOut.create(
					cc.moveBy(0.22,cc.p(1200,400))
				),
				cc.callFunc(function() {
					if( typeof cb === "function" ) cb();
				})
			)
		);
	},

	land: function(pos, cb) {
		var self = this,
			sea = this._sea,
			seaRect = sea.getBoundingBox(),
			xStart = seaRect.x + this._incoming?seaRect.width:0,
			distance = Math.abs(pos.x - xStart);

		this.setScale(0.0);

		this.runAction(
			cc.sequence(
				cc.delayTime(3 - 0.66*distance/seaRect.width),
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
					
					if( hit && !self._incoming ) { cc.audioEngine.playEffect(gRes.own_bomb_on_ship_mp3); }
					else if( hit )               { cc.audioEngine.playEffect(gRes.other_bomb_on_ship_mp3); }
					else if( !self._incoming )   { cc.audioEngine.playEffect(gRes.own_bomb_in_water_mp3); self._sea.getParent().checkSquare(pos); }
					else 						 { cc.audioEngine.playEffect(gRes.other_bomb_in_water_mp3); }

					cb(hit);
				})
			)
		);
	},
});


// TypeWriter is the class for the typewriter function
//
// Methods
// -------
//
// Properties
// ----------
//
var TypeWriter = cc.PhysicsSprite.extend({

	_space: null,
	_sea: null,
	_clickable: true,
	_dragable: true,
	_shape: null,
	_crosshair: null,
	_finalCallback: null,
	_crossHairStatic: false,

	getCrosshair: function() { return this._crosshair; },
	setCrosshair: function(crosshair) { this._crosshair = crosshair; },

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(parent, pos, sea, cb) {
        cc.PhysicsSprite.prototype.ctor.call(this);
        
		cc.assert(parent._space, "Parent must have a chipmunk space attibute.");
        this._space = parent._space;
		this._sea = sea;
		this._finalCallback = cb;

		var frame = cc.spriteFrameCache.getSpriteFrame("typewriter.png");
        this.initWithSpriteFrame(frame);
		this.setAnchorPoint(0.50,0.42);
		var width = 140,
			height = 140,
			mass = 60,
			typewriter = this._space.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height))),
			box = this._shape = this._space.addShape(new cp.BoxShape(typewriter, width, height));
		box.setElasticity(0.1);
		box.setFriction(1.5);		
		box.setCollisionType(_B_COLL_TYPE_OBJECT);

		this.setBody(typewriter);
        this.setPosition(pos);

		var crosshair = this._crosshair = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("crosshair.png"),cc.rect(0,0,103,102));
		crosshair.setPosition(cc.p(60,46));
		crosshair.setOpacity(0);
		this.addChild(crosshair,30);
		_b_retain(crosshair,"Bomb: crosshair");	
		
		this.scheduleUpdate();
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

				var ships = this._sea.getChildren(),
					letter = null;
				for( var i=0 ; i<ships.length ; i++ ) if( ships[i].getLetterAtPosition && (letter = ships[i].getLetterAtPosition({x:dpos.x, y:dpos.y+_B_CROSSHAIR_Y_OFFSET})) ) break;
				if( letter && !this._imAboveALetter ) {
					this.runAction(cc.fadeTo(0.22,100));
					this._imAboveALetter = true;
				} else if( !letter && this._imAboveALetter ) {
					this.runAction(cc.fadeOut(0.22));
					this._imAboveALetter = false;
				}
			} else {
				if( this._imIn ) {
					this._imIn = false;
					this._imAboveALetter = false;
					this.getCrosshair().runAction(cc.fadeOut(0.22));
					this.runAction(cc.fadeIn(0.22));
				}
			}

			this.getBody().setVel(cp.v((dpos.x-pos.x)*10,(dpos.y-pos.y+_B_CROSSHAIR_Y_OFFSET)*10));
			this._renderCmd.setDirtyFlag(cc.Node._dirtyFlags.transformDirty);
		}
	},
	
	land: function(cb) {
		var self = this,
			parent = this.getParent();	

		if( !this._imIn || !parent ) {
			if( typeof cb === "function" ) cb();
			return;
		}

		var	dpos = this.draggingPos,
			seaRect = this._sea.getBoundingBox(),
			letter = null;
		
		for( var i=0 ; i<ships.length ; i++ ) {
			var ship = ships[i];
			if( letter = ship.getLetterAtPosition({x:dpos.x, y:dpos.y+_B_CROSSHAIR_Y_OFFSET}) ) break;
		}
		if( letter ) {
			var	sea = this._sea,
				word = ship.getWord(),
				layer = this.getParent(),
				input = new TextInputLayer(10, function(text) {
					if( input ) { // this is a work around, as this callback gets called after input is set to null within this callback
						self._crossHairStatic = false;
						self._imIn = false;
						self._imAboveALetter = false;
						self.getCrosshair().runAction(cc.fadeOut(0.22));
						self.runAction(cc.fadeIn(0.22));

						layer.removeChild(input);
						_b_release(input);
						input = null;

						layer.eachObject(function(i, obj) { 
							if( obj.resumeTimer ) obj.resumeTimer();
						});

						layer.initListeners();

						cc.log("We have a text: "+text);
						if( typeof self._finalCallback === "function" ) self._finalCallback(ship, text);
					}
				});

			this._crossHairStatic = true;

			layer.addChild(input,20);
			_b_retain(input, "Input field");

			cc.assert(layer.eachObject, "Parent layer must have a object management (fairyLayer does).");

			layer.eachObject(function(i, obj) { 
				if( obj.pauseTimer ) obj.pauseTimer();
			});

			layer.stopListeners();	
		} else {
			this._imIn = false;
			this._imAboveALetter = false;
			this.getCrosshair().runAction(cc.fadeOut(0.22));
			this.runAction(cc.fadeIn(0.22));	
		}

		//$b.sendMessage({ message: "bomb", pos: cc.p(dpos.x-seaRect.x, dpos.y+_B_CROSSHAIR_Y_OFFSET-seaRect.y) });	

		if( typeof cb === "function" ) cb();
	},

	containsPoint: function(point) {
		var rect = this.getBoundingBox();

		if( rect && cc.rectContainsPoint(rect, point) ) return true;
		else return false;
	},

	update: function(dt) {
		if( this._crossHairStatic ) {
			this.dragging();
		}
	},

	exit: function() {
		this.onExit();
		
		var shape = this._shape;
			body = this.getBody();

		if( shape ) this._space.removeShape(shape);
		if( body ) this._space.removeBody(body);
		_b_release(this._crosshair);
		cc.log("TypeWriter.exit: removing Object...");
		this.getParent().removeObject(this);
	}	
});

var MyGameSymbol = GameSymbol.extend({
    _sea1: null,
    _sea2: null,

    ctor: function(sea1, sea2, cb) {	 
        this._sea1 = sea1;
        this._sea2 = sea2;

		this._super(cb);
	},

    restore: function(cb) {
        this._super(cb);

		var sea1 = this._sea1,
            sea2 = this._sea2,
            symSize = this.getContentSize(),
			seaSize = sea1.getContentSize();

		sea1.setPosition(cc.p(symSize.width/2-seaSize.width*_B_SEA_SYMBOL_SCALE/2-4, symSize.height/2));
		sea1.setScale(_B_SEA_SYMBOL_SCALE);
		this.addChild(sea1);
		sea2.setPosition(cc.p(symSize.width/2+seaSize.width*_B_SEA_SYMBOL_SCALE/2+4, symSize.height/2));
		sea2.setScale(_B_SEA_SYMBOL_SCALE);
		this.addChild(sea2);
    }
});


var WordBattleScene = cc.Scene.extend({
	gameState: null,
	game: "wordbattle",
	variation: null,
	ctor: function(variation) {
        this._super();

		var state = $b.getState();

		cc.assert(gameRes[this.game][variation],"No resources for "+variation+" in resource object gameRes");
    	this.variation = variation;
    	
		gRes = gameRes[this.game]["All"];
		sRes = gameRes[this.game]["SoundInfo"];
		vRes = gameRes[this.game][variation];

    	state.currentGame 	  = this.game;
    	state.currentVariation = this.variation;
		if( !state[this.variation] ) state[this.variation] = {};
		if( !state[this.variation].words ) state[this.variation].words = [];

		cc.audioEngine.setEffectsVolume(0.5);
		cc.audioEngine.setMusicVolume(0.5);

        $b.sendCommand({
        	command: "registerVariation",
        	variation: this.game+"/"+this.variation
        });   
	},

    onEnter: function () {
        this._super();

		var state = $b.getState()[this.variation];
        this.addChild(new WordBattleLayer(state));
    },
    
    onExit: function() {
        this._super();
    }
});

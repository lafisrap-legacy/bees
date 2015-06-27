// DocumentLayer
// 
// The documents layer is the the base class for documents for the collectors booklet 


// DocumentsLayer Constants
//
//

var _B_DOCUMENT_SHAPES = {
	Paper: {
		sprite: {
			top: "paper_top.png",
			middle: ["paper_middle_1.png","paper_middle_2.png","paper_middle_3.png"],
			bottom: "paper_bottom.png"
		},
		margin: {left: 50, right: 50, top:100, bottom: 100}
	}
},
	_B_TOUCH_THRESHOLD = 10,
	_B_SCROLL_INERTANCE = 0.985
	_B_SCROLL_THRESHOLD_1 = 1,
	_B_SCROLL_THRESHOLD_2 = 7,
	_B_SYMBOL_POS = cc.p(980, 70),
	_B_GAMESYMBOL_ROTATION = 11;

// Regular Expressions
//
_b_plainWords = /\b[\wäöüÄÖÜß]{2,}/g;
_b_WordsWithPunctuation = /([^\wäöüÄÖÜß]|\s)*„?([\wäöüÄÖÜß]{2,})[^\wäöüÄÖÜß\„]*/g;  // currently only German umlauts

	
// DocumentsLayer provides a one page paper with variable size and text and images on it.
// Single words can be controlled. 
//
// Methods
// -------
//
// Properties
// ----------
//
var DocumentLayer = cc.Layer.extend({

	_words: [],
	_paragraphStarts: [],
	_selectedWords: [],
	_firstDisplayedWord: null,
	_lastDisplayedWord: null,

	_box: null,
	_shape: null,
	_gameSymbol: null,

	// ctor initializes sprite cache
	//
    ctor: function(title, text, collectedWords, sizes) {

		var self = this,
			words = this._words;

        this._super();
        
	    cc.spriteFrameCache.addSpriteFrames(res.documents_plist);	  

		var box = this._box = cc.Layer.create(),
			shape = this._shape = _B_DOCUMENT_SHAPES[sizes.type],
			boxWidth = cc.width - shape.margin.left - shape.margin.right;

		_b_retain(box, "Text box");

		var labelX, labelY = shape.margin.top,
			paragraphStart = 0,
			cnt = 0;

		/////////////////////////////////////////////////////////////////////7
		// Define actions 
		this._actionWordBlink = cc.repeatForever(
			cc.sequence(
				cc.EaseSineIn.create(
					cc.scaleTo(1.6+Math.random()*0.4,1.1)
				),
				cc.EaseSineOut.create(
					cc.scaleTo(1.8,1)
				)
			)
		);
		this._actionSymbolBlink = cc.repeatForever(
			cc.sequence(
				cc.EaseSineIn.create(
					cc.scaleTo(0.4,0.95)
				),
				cc.EaseSineOut.create(
					cc.scaleTo(0.4,1)
				),
				cc.EaseSineIn.create(
					cc.scaleTo(0.4,0.95)
				),
				cc.EaseSineOut.create(
					cc.scaleTo(0.4,1)
				),
				cc.EaseSineIn.create(
					cc.scaleTo(0.4,0.95)
				),
				cc.EaseSineOut.create(
					cc.scaleTo(0.4,1)
				),
				cc.EaseSineIn.create(
					cc.scaleTo(0.4,0.95)
				),
				cc.EaseSineOut.create(
					cc.scaleTo(0.4,1)
				),
				cc.EaseSineIn.create(
					cc.spawn(
						cc.scaleTo(0.8,0.6),
						cc.rotateBy(0.8,180)
					)
				),
				cc.EaseSineOut.create(
					cc.spawn(
						cc.scaleTo(0.8,1),
						cc.rotateBy(0.8,180)
					)
				)
			)
		);

		/////////////////////////////////////////////////////////////////////7
		// Draw Title
		var label = cc.LabelTTF.create(title, _b_getFontName(res.indieflower_ttf), sizes.fontSize * 2, cc.size(boxWidth, sizes.fontSize * 2) ,cc.TEXT_ALIGNMENT_CENTER, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
		label.setPosition(cc.p(boxWidth/2+shape.margin.left,cc.height - labelY));
		label.setColor(cc.color(0,0,0,255));
		box.addChild(label,10);

		labelY += sizes.fontSize * 3;

		/////////////////////////////////////////////////////////////////////7
		// Draw words of fairytale
		var i=0;
		(function addWords() {
			var p = text[i].replace(/[\{\}]/g,""),
				plainWords = p.match(_b_plainWords),
				fullWords = p.match(_b_WordsWithPunctuation),
				selectedWords = [],
				labelX = shape.margin.left,
				cw = collectedWords[i] || [],
				sw = [];
	   	
			var word;	
			while( (word=_b_selectedWords.exec(text[i])) != null ) {
				sw.push(word[1]);
			}

			cc.assert(plainWords.length === fullWords.length, "Number of words doesn't match between _pureWords and _fullWords.");

			for( var j=0 ; j<plainWords.length ; j++ ) {
				// create word sprite 
				//var label = new cc.LabelBMFont( fullWords[j] , "res/fonts/indieflower50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT );
				var label = cc.LabelTTF.create(fullWords[j], _b_getFontName(res.indieflower_ttf), sizes.fontSize, undefined,cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);

				labelX += label.width; 
				if(labelX > cc.width - shape.margin.right ) {
					labelX = shape.margin.left + label.width;
					labelY += sizes.lineHeight;
				}

				if( sw.length && sw[0] === plainWords[j] ) selectedWords.push({ord:j, word:sw.splice(0,1)[0]});

				var word = {
					label:	label, 
					full:	fullWords[j], 
					plain:	plainWords[j], 
					pos:	cc.p(labelX, labelY), 
					visible: 	false, 
					color: 		cc.color(0,0,0), 
					opacity: 	(j<3 || j>plainWords.length-4)?255:0,
					collected: 	false
				};

				words.push(word);

				label.setColor(word.color);
				label.setOpacity(word.opacity);
				label.setPosition(cc.p(labelX - label.width/2, cc.height - labelY));

				cnt++;
			}

			cc.assert( sw.length === 0, "Not all selected words were found in the text.");
			cc.log("Finished creating word labels for paragraph "+i);

			self._selectedWords[i] = selectedWords;
			
			self._paragraphStarts[i] = paragraphStart;
			paragraphStart += plainWords.length;

			labelY += sizes.lineHeight * 2; // new line after paragraph

			for( var j=0 ; j<cw.length ; j++ ) self.insertWordIntoParagraph(cw[j], i);

			if( ++i < text.length ) setTimeout(addWords,1);
			else {	
				// draw document top
				var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(shape.sprite.top),cc.rect(0,0,1136,155));
				sprite.setPosition(cc.p(cc.width/2,cc.height-155/2));
				box.addChild(sprite,0);

				// draw middle elements
				var elems = Math.ceil((labelY - 155 - 79)/352);
				for( var j=0 ; j<elems ; j++ ) {
					var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(shape.sprite.middle[Math.floor(Math.random()*shape.sprite.middle.length)]),cc.rect(0,0,1136,360));
					sprite.setPosition(cc.p(cc.width/2,cc.height-155-j*352-180));
					box.addChild(sprite,0);
				}

				// draw document bottom
				var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(shape.sprite.bottom),cc.rect(0,0,1136,79));
				sprite.setPosition(cc.p(cc.width/2,cc.height-155-j*352-79/2));
				box.addChild(sprite,0);

				self._height = labelY;				
				cc.eventManager.dispatchCustomEvent("paragraphs_prepared");		
			}
		})();

		this.setCascadeOpacityEnabled(true);

		cc.log("Baking "+cnt+" words");
		box.bake();
	},

	getBox:         function() { return this._box; },
    getGameSymbol:  function() { return this._gameSymbol; },

	getWord: function(word, p) {
		return this._words[this.getOrds(word, p).ord];
	},

	getOrds: function(word, p) {
		var words = this._words,
			p = p || this._paragraph || 0,
			sw = this._selectedWords[p],
			fw = this._paragraphStarts[p],
			lw = (this._paragraphStarts[p+1] || words.length) - 1,
			word = word.plain? word.plain : word;

		for( var i=0 ; i<sw.length ; i++ ) if( word === sw[i].word ) break;
		cc.assert(i<sw.length, "Collected word "+word+" was not found in selected words.");

		return {
			ord:  sw[i].ord, 
			prev: sw[i-1] && sw[i-1].ord+1 || fw,
			next: sw[i+1] && sw[i+1].ord-1 || lw
		}
	},

	insertWordIntoParagraph: function(word, p) {
		var words = this._words,
			p = p || this._paragraph || 0,
			sw = this._selectedWords[p],
			fw = this._paragraphStarts[p],
			lw = (this._paragraphStarts[p+1] || words.length) - 1,
			ords = this.getOrds(word, p);

		if( word.color ) words[ords.ord].color = word.color;
		if( word.opacity ) words[ords.ord].opacity = word.opacity;
		words[ords.ord].label.setColor(word.color);
		words[ords.ord].label.setScale(0.0);
		words[ords.ord].label.runAction(
			cc.spawn(
				cc.fadeTo(2, word.opacity),
                cc.scaleTo(2, 1)
			)
		);

		for( var i=ords.prev ; i<=ords.next ; i++ ) {
			if( word.opacity > words[i].opacity && i != ords.ord ) {
				words[i].opacity = word.opacity;
		        if( word.opacity < 255 ) words[i].label.setColor(word.color);
		        words[i].label.setScale(0.0);
				words[i].label.runAction(
                    cc.sequence(
                        cc.delayTime(Math.random()+1),
                        cc.spawn(
                            cc.fadeTo(2, word.opacity),
                            cc.scaleTo(2, 1)
                        )
                    )
				);
			}
		}
	},

	prepare: function(paragraph, gameSymbol) {
		var self = this;

		cc.assert(paragraph < self._paragraphStarts.length, "Requested paragraph "+paragraph+" does not exist.");
		
		var box = this._box,
			shape = this._shape,
			fdw = this._paragraphStarts[paragraph],
			word = this._words[fdw];

		posY = paragraph===0? 0 : word.pos.y - shape.margin.top;  
		this.showWordsAtPosition(posY);

		////////////////////////////////////////////////////////
		// Show game start symbol with seas
		this._gameSymbol = gameSymbol || new GameSymbol(cb);

		gameSymbol.setPosition(cc.p(_B_SYMBOL_POS.x, cc.height - word.pos.y + _B_SYMBOL_POS.y));
		box.addChild(gameSymbol);
		box.setScale(0.8);
		box.setOpacity(0);
		box.setCascadeOpacityEnabled(true);

		this._posY = posY;
		this._paragraph = paragraph;
		
		this.initListeners();
		
		this.show();
	},

	show: function(y) {
		var self = this,
			box = this._box,
            margin = this._shape.margin,
			gameSymbol = this._gameSymbol,
			posY = Math.max( y || this._posY, margin.top) - margin.top;

		this._speed = 0;
        this._lastY = this._posY = posY;	
		this.showWordsAtPosition(posY);

		this.addChild(box);
		box.runAction(
			cc.EaseSineIn.create(
				cc.spawn(
					cc.scaleTo(0.90, 1),
					cc.fadeIn(0.90)
				)
			)
		);

		gameSymbol.setRotation(_B_GAMESYMBOL_ROTATION);
		gameSymbol.runAction(this._actionSymbolBlink.clone());

		this.initListeners();
	},

	hide: function(cb) {
		var self = this,
			box = this._box;

		this.stopListeners();
		box.runAction(
			cc.sequence(
				cc.EaseSineOut.create(
					cc.spawn(
						cc.scaleTo(0.90,0.7),
						cc.fadeOut(0.90)
					)
				),
				cc.callFunc(function() {
					self.removeChild(box);
					if(typeof cb === "function") cb();
				})
			)
		);
	},

	showWordsAtPosition: function(posY) {
		var box = this._box,
			fdw = this._firstDisplayedWord || 0,
			ldw = this._lastDisplayedWord || 0,
			word = this._words[fdw];
		
		if( posY === undefined ) posY = this._posY;
		box.setPosition(0, posY);

		// look if first words or last words have to be added
		if( word.pos.y < posY || fdw === 0 ) {
			while( word.pos.y < posY ) {
				if( word.visible ) {
					box.removeChild(word.label);
					word.visible = false;
					if( word.collected ) word.label.runAction(this._actionWordBlink.clone());
					_b_release(word.label);
				}
				if( fdw === this._words.length-1 ) break; 
				word = this._words[++fdw];
			}

			word = this._words[ldw];
			while( word.pos.y < posY + cc.height + 100 ) {
				if( !word.visible && word.pos.y >= posY ) {
					box.addChild(word.label ,10);
					word.visible = true;
					_b_retain(word.label, "Word "+word.plain);
				}
				if( ldw === this._words.length-1 ) break;
				word = this._words[++ldw];
			}
		} else {
			while( word.pos.y > posY ) {
				if( !word.visible && word.pos.y - posY - 100 < cc.height ) {
					box.addChild(word.label ,10);
					word.visible = true;
					_b_retain(word.label, "Word "+word.plain);
				}
				if( fdw === 0 ) break; 
				word = this._words[--fdw];
			}

			word = this._words[ldw];
			while( word.pos.y > posY + cc.height ) {
				if( word.visible ) {
					box.removeChild(word.label);
					word.visible = false;
					_b_release(word.label);
				}
				if( ldw === 0 ) break;
				word = this._words[--ldw];
			}
		}

		this._firstDisplayedWord = fdw;
		this._lastDisplayedWord = ldw;
	},

	initListeners: function() {
		var self = this;

        cc.eventManager.addListener(cc.EventListener.create({
           	event: cc.EventListener.TOUCH_ALL_AT_ONCE,
           	onTouchesBegan: function(touches, event) {
               	console.log("onTouchesBegan!");
                var touch = touches[0],
               		loc = touch.getLocation();

                self.touchStartPoint = {
                   	x: loc.x,
                   	y: loc.y
               	};

				self._startY = self._posY;

              	self.touchLastPoint = {
                	x: loc.x,
                	y: loc.y
                };
            },

           	onTouchesMoved: function(touches, event) {
            	var touch = touches[0],
					loc = touch.getLocation(),
                    start = self.touchStartPoint;

               	self.touchLastPoint = {
                	x: loc.x,
                    y: loc.y
                };

				self._posY = Math.min(Math.max(self._startY + loc.y - start.y, 0),self._height);
				self.showWordsAtPosition();
            },

            onTouchesEnded: function(touches, event){
            	console.log("onTouchesEnded!");

                var touch = touches[0],
                    loc = touch.getLocation();

                self.touchStartPoint = null;
            }
        }), this);

		self.scheduleUpdate();
	},

	// stopListeners stops the event handling
	stopListeners: function() {
		var self = this;

        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
		this._touchListener = null;

		self.unscheduleUpdate();
    },    

	update: function(dt) {
		var posY = this._posY,
			lastY = this._lastY,
			speed = this._speed,
			margin = this._shape.margin.top,
			ps = this._paragraphStarts,
			words = this._words;

		if( lastY === posY && speed) {
			posY = this._posY = Math.min(Math.max(posY + speed, 0),this._height);
			this.showWordsAtPosition();
		}
				
		speed = (posY - lastY) * _B_SCROLL_INERTANCE;
		if( Math.abs(speed) < _B_SCROLL_THRESHOLD_1 ) speed = 0;
		else if( Math.abs(speed) < _B_SCROLL_THRESHOLD_2 ) {
			for( var i=0 ; i<ps.length ; i++ ) {
				var wordY = words[ps[i]].pos.y;
				if( Math.abs(wordY - posY - margin ) < _B_SCROLL_THRESHOLD_2 ) {
					posY = this._posY = wordY;
					speed = 0;
					this.showWordsAtPosition();
					break;
				}
			}
		}

		this._lastY = posY;
		this._speed = speed;
	}
});	


var GameSymbol = cc.Sprite.extend({
	_finalCallback: null,

	ctor: function(cb) {
        cc.Sprite.prototype.ctor.call(this);

		var frame = cc.spriteFrameCache.getSpriteFrame("startgame.png");
        this.initWithSpriteFrame(frame);

		this.initListeners();

        this.restore(cb);
	},

	initListeners: function() {
		var self = this;

        this._touchListener = cc.EventListener.create({
           	event: cc.EventListener.TOUCH_ALL_AT_ONCE,
           	onTouchesBegan: function(touches, event) {
               	console.log("onTouchesBegan!");
                var loc = touches[0].getLocation(),
                    pos = self.getParent().convertToWorldSpace(self.getPosition());
                    rect  = cc.rect(pos.x-self.width/2, pos.y-self.height/2, self.width, self.height);

                if( rect && cc.rectContainsPoint(rect, loc) && typeof self._finalCallback === "function" ) {
                    self.getParent().getParent().hide();
                    self._finalCallback();
                }   
            },
        });
		
		cc.eventManager.addListener(this._touchListener, this);
	},

	// stopListeners stops the event handling
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
		this._touchListener = null;
    },   

    restore: function(cb) {
		this._finalCallback = cb;
        this.initListeners();
    } 
});

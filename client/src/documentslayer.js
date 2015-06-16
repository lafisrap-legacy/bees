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
	_B_SCROLL_THRESHOLD_2 = 10;

// Regular Expressions
//
_b_plainWords = /\b[\wäöüÄÖÜß]{2,}/g;
_b_WordsWithPunctuation = /\s*„?\b([\wäöüÄÖÜß]{2,})[^\wäöüÄÖÜß\„]*/g;  // currently only German umlauts

	
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

		this.addChild(box,20);
		_b_retain(box, "Text box");

		var labelX, labelY = shape.margin.top,
			paragraphStart = 0,
			cnt = 0;

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
					status: {
						visible: 	false, 
						color: 		cc.color(0,0,0), 
						opacity: 	(j<3 || j>plainWords.length-4)?255:0,
						collected: 	false
					}
				};

				words.push(word);

				label.setColor(word.status.color);
				label.setOpacity(word.status.opacity);
				label.setPosition(cc.p(labelX - label.width/2, cc.height - labelY));

				cnt++;
			}

			cc.assert( sw.length === 0, "Not all selected words were found in the text.");
			cc.log("Finished creating word labels for paragraph "+i);

			self._selectedWords[i] = selectedWords;
			
			self._paragraphStarts[i] = paragraphStart;
			paragraphStart += plainWords.length;

			labelY += sizes.lineHeight * 2; // new line after paragraph

			for( var j=0 ; j<cw.length ; j++ ) self.insertWordIntoParagraph(i, cw[j]);

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

		cc.log("Baking "+cnt+" words");
		box.bake();
	},

	insertWordIntoParagraph: function(p, word) {
		var words = this._words,
			sw = this._selectedWords[p],
			fw = this._paragraphStarts[p],
			lw = (this._paragraphStarts[p+1] || words.length) - 1;

		for( var i=0 ; i<sw.length ; i++ ) if( word.word === sw[i].word ) break;
		cc.assert(i<sw.length, "Collected word was not found in selected words.");

		var ord = sw[i].ord;

		if( word.color ) words[ord].status.color = word.color;
		if( word.opacity ) words[ord].status.opacity = word.opacity;
		words[ord].label.runAction(
			cc.spawn(
				cc.fadeTo(2, word.opacity),
				cc.tintTo(2, word.color)
			)
		);
		words[ord].status.collected = true;

		var lowerEnd = sw[i-1] && sw[i-1].ord+1 || fw,
			upperEnd = sw[i+1] && sw[i+1].ord-1 || lw;

		for( var i=lowerEnd ; i<upperEnd ; i++ ) {
			if( word.opacity > words[i].status.opacity && i != ord ) {
				words[i].status.opacity = word.opacity;
				words[i].label.runAction(
					cc.spawn(
						cc.fadeTo(2, word.opacity),
						cc.TintTo(2, word.color)
					)
				);
			}
		}
	},

	show: function(paragraph) {
		var self = this;

		cc.assert(paragraph < self._paragraphStarts.length, "Requested paragraph "+paragraph+" does not exist.");
		
		var box = self._box,
			shape = this._shape,
			fdw = self._paragraphStarts[paragraph],
			word = self._words[fdw];

		posY = paragraph===0? 0 : word.pos.y - shape.margin.top;  
		this.showWordsAtPosition(posY);

		this._posY = this._lastY = posY;
		this._speed = 0;
		
		this.initListeners();

				// handle words that are add and words that are not
				// add background
				// add scrolling:
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
				if( word.status.visible ) {
					box.removeChild(word.label);
					word.status.visible = false;
					if( word.status.collected ) word.label.runAction(
						cc.repeatForever(
							cc.sequence(
					    		cc.EaseSineIn.create(
									cc.tintTo(1,cc.color.BLACK)
								),
					    		cc.EaseSineOut.create(
									cc.tintTo(1,word.status.color)
								)
							)
						)
					);
					_b_release(word.label);
				}
				if( fdw === this._words.length-1 ) break; 
				word = this._words[++fdw];
			}

			word = this._words[ldw];
			while( word.pos.y < posY + cc.height + 100 ) {
				if( !word.status.visible && word.pos.y >= posY ) {
					box.addChild(word.label ,10);
					word.status.visible = true;
					_b_retain(word.label, "Word "+word.plain);
				}
				if( ldw === this._words.length-1 ) break;
				word = this._words[++ldw];
			}
		} else {
			while( word.pos.y > posY ) {
				if( !word.status.visible && word.pos.y - posY - 100 < cc.height ) {
					box.addChild(word.label ,10);
					word.status.visible = true;
					_b_retain(word.label, "Word "+word.plain);
				}
				if( fdw === 0 ) break; 
				word = this._words[--fdw];
			}

			word = this._words[ldw];
			while( word.pos.y > posY + cc.height ) {
				if( word.status.visible ) {
					box.removeChild(word.label);
					word.status.visible = false;
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
			posY = Math.min(Math.max(posY + speed, 0),this._height);
			this.showWordsAtPosition();
		}
				
		speed = (posY - lastY) * _B_SCROLL_INERTANCE;
		if( Math.abs(speed) < _B_SCROLL_THRESHOLD_1 ) speed = 0;
		else if( Math.abs(speed) < _B_SCROLL_THRESHOLD_2 ) {
			for( var i=0 ; i<ps.length ; i++ ) {
				var pY = words[ps[i]].pos.y;
				if( Math.abs(pY - posY - margin ) < _B_SCROLL_THRESHOLD_2 ) {
					posY = pY;
					speed = 0;
					this.showWordsAtPosition();
					break;
				}
			}
		}

		this._lastY = this._posY = posY;
		this._speed = speed;
		cc.log("Speed: "+this._speed);
	}
});	

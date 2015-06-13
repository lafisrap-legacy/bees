// DocumentsLayer
// 
// The documents layer file contains documents for the collectors booklet 


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
}

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
	_firstDisplayedWord: null,
	_lastDisplayedWord: null,

	_box: null,
	_shape: null,

	// ctor initializes sprite cache
	//
    ctor: function(title, text, sizes) {
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
				labelX = shape.margin.left;

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

				var word = {label: label, full:fullWords[j], plain:plainWords[j], pos:cc.p(labelX, labelY), status: {visible: false, color: cc.color(0,0,0), opacity: 255} };
				words.push(word);

				label.setColor(word.status.color);
				label.setOpacity(word.status.opacity);
				label.setPosition(cc.p(labelX - label.width/2, cc.height - labelY));

				cnt++;
			}

			cc.log("Finished paragraph "+i);

			self._paragraphStarts[i] = paragraphStart;
			paragraphStart += plainWords.length;

			labelY += sizes.lineHeight; // new line after paragraph

			if( ++i < text.length ) setTimeout(addWords,1);
			else {	
				// draw document top
				var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(shape.sprite.top),cc.rect(0,0,1136,155));
				sprite.setPosition(cc.p(cc.width/2,cc.height-155/2));
				box.addChild(sprite,0);

				// draw middle elements
				var elems = Math.ceil((labelY - 155 - 79)/360);
				for( var j=0 ; j<elems ; j++ ) {
					var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(shape.sprite.middle[Math.floor(Math.random()*shape.sprite.middle.length)]),cc.rect(0,0,1136,360));
					sprite.setPosition(cc.p(cc.width/2,cc.height-155-j*360-180));
					box.addChild(sprite,0);
				}

				// draw document bottom
				var sprite = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(shape.sprite.bottom),cc.rect(0,0,1136,79));
				sprite.setPosition(cc.p(cc.width/2,cc.height-155-j*360-79/2));
				box.addChild(sprite,0);
				
				cc.eventManager.dispatchCustomEvent("paragraphs_prepared");		
			}
		})();

		cc.log("Baking "+cnt+" words");
		box.bake();
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

				// handle words that are add and words that are not
				// add background
				// add scrolling:
	},

	showWordsAtPosition: function(posY) {
		var box = this._box,
			fdw = this._firstDisplayedWord || 0,
			ldw = this._lastDisplayedWord || 0,
			word = this._words[fdw];
		
		box.setPosition(0, posY);
		
		// look if first words or last words have to be added
		if( word.pos.y < posY || ldw === 0 ) {
			while( word.pos.y < posY ) {
				if( word.status.visible ) {
					box.removeChild(word.label);
					word.status.visible = false;
					_b_release(word.label);
				}
				if( fdw === this._words.length-1 ) break; 
				word = this._words[++fdw];
			}

			word = this._words[ldw];
			while( word.pos.y < posY + cc.height ) {
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
				if( !word.status.visible && word.pos.y - posY < cc.height ) {
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
});	

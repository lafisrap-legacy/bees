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
		dim: cc.rect(100, 500, 936, 460)
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
	_dim: null,

	// ctor initializes sprite cache
	//
    ctor: function(text, shape) {
		var self = this,
			words = this._words;

        this._super();
        
	    cc.spriteFrameCache.addSpriteFrames(res.documents_plist);	  

		var box = this._box = cc.Layer.create(),
			dim = this._dim = _B_DOCUMENT_SHAPES[shape.type].dim;

		this.addChild(box,20);
		_b_retain(box, "Text box");

		var labelX, labelY = 0,
			paragraphStart = 0,
			cnt = 0;

		var i=0;
		(function addWords() {
			var p = text[i].replace(/[\{\}]/g,""),
				plainWords = p.match(_b_plainWords),
				fullWords = p.match(_b_WordsWithPunctuation),
				labelX = 0;

			cc.assert(plainWords.length === fullWords.length, "Number of words doesn't match between _pureWords and _fullWords.");

			for( var j=0 ; j<plainWords.length ; j++ ) {
				// create word sprite 
				//var label = new cc.LabelBMFont( fullWords[j] , "res/fonts/indieflower50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT );
				var label = cc.LabelTTF.create(fullWords[j], _b_getFontName(res.indieflower_ttf), shape.fontSize, undefined,cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);

				labelX += label.width; 
				if(labelX > dim.width ) {
					labelX = label.width;
					labelY -= shape.lineHeight;
				}

				var word = {label: label, full:fullWords[j], plain:plainWords[j], pos:cc.p(labelX, labelY), status: {added: false, color: cc.color(0,0,0), opacity: 255} };
				words.push(word);

				label.setColor(word.status.color);
				label.setOpacity(word.status.opacity);
				label.setPosition(cc.p(dim.x + labelX - label.width/2, dim.y + labelY));

				cnt++;
			}

			cc.log("Finished paragraph "+i);

			self._paragraphStarts[i] = paragraphStart;
			paragraphStart += plainWords.length;

			labelY -= shape.lineHeight; // new line after paragraph

			if( ++i < text.length ) setTimeout(addWords,1);
			else cc.eventManager.dispatchCustomEvent("paragraphs_prepared");		
		})();

		cc.log("Baking "+cnt+" words");
		box.bake();
	},

	show: function(paragraph) {
		var self = this;

		cc.assert(paragraph < self._paragraphStarts.length, "Requested paragraph "+paragraph+" does not exist.");
		
		_b_one(["paragraphs_prepared"], function() {
			var box = self._box,
				dim = self._dim,
				fdw = self._firstDisplayedWord = self._paragraphStarts[paragraph],
				ldw = fdw,
				word = self._words[fdw],
				boxPos = -word.pos.y;

			box.setPosition(0, boxPos);

			var i = fdw;
			while( boxPos - word.pos.y < dim.height ) {
				box.addChild(word.label,20);
				_b_retain(word.label,"Word "+word.plain);
				
				ldw = i;
				word = self._words[++i];
			}

			
				// handle words that are add and words that are not
				// add background
				// add scrolling:
		});
	}
});	

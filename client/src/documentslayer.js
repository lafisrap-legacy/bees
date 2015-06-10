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
		dim: cc.rect(50, 600, 800, 0)
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
	_textStatus: [],
	_box: null,

	// ctor initializes sprite cache
	//
    ctor: function(text, shape) {
		var self = this,
			words = this._words;

        this._super();
        
	    cc.spriteFrameCache.addSpriteFrames(res.documents_plist);	  

		var box = this._box = cc.Layer.create(),
			dim = _B_DOCUMENT_SHAPES[shape.type].dim;

		this.addChild(box,20);
		_b_retain(box, "Text box");

		var labelX, labelY = dim.y,
			paragraphStart = 0,
			cnt = 0;

		var i=0;
		(function addWords() {
			var p = text[i].replace(/[\{\}]/g,""),
				plainWords = p.match(_b_plainWords),
				fullWords = p.match(_b_WordsWithPunctuation),
				labelX = dim.x;

			labelY -= shape.lineHeight;

			cc.assert(plainWords.length === fullWords.length, "Number of words doesn't match between _pureWords and _fullWords.");

			for( var j=0 ; j<plainWords.length ; j++ ) {
				// create word sprite 
				//var label = new cc.LabelBMFont( fullWords[j] , "res/fonts/indieflower50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT );
				var label = cc.LabelTTF.create(fullWords[j], _b_getFontName(res.indieflower_ttf), shape.fontSize, undefined,cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP),
					word = {label: label, full:fullWords[j], plain:plainWords[j], pos:cc.p(labelX, labelY), status: {added: false, color: cc.color(0,0,0), opacity: 255} };
				
				words.push(word);

				label.setColor(word.status.color);
				label.setOpacity(word.status.opacity);
				label.setPosition(cc.p(labelX+label.width/2, labelY));

				labelX += label.width; 
				if(labelX > dim.x + dim.width ) {
					labelX = dim.x;
					labelY -= shape.lineHeight;
				}

				cnt++;
			}

			cc.log("Finished paragraph "+i);

			self._paragraphStarts[i] = paragraphStart;
			paragraphStart += plainWords.length;

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
			var wStart = self._paragraphStarts[paragraph],
				firstWord = self._words[wStart];
				// handle words that are add and words that are not
				// add background
				// add scrolling:
			// box.addChild(label,20);
			// word.status.added = true;
			//_b_retain(label,"Word "+plainWords[j]);
		});
	}
});	

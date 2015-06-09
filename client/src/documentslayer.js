// DocumentsLayer
// 
// The documents layer file contains documents for the collectors booklet 


// DocumentsLayer Constants
//
//

var _B_DOCUMENT_BOX = cc.rect(50, 600, 800, 0);

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
var DocumentsLayer = cc.Layer.extend({

	_paragraphs: [],
	_textStatus: [],
	_box: null,

	// ctor initializes sprite cache
	//
    ctor: function(text, fontSize, lineHeight) {
        this._super();  
        
	    cc.spriteFrameCache.addSpriteFrames(res.documents_plist);	  

		var box = this._box = cc.Layer.create(),
			dim = _B_DOCUMENT_BOX;

		this.addChild(box,20);
		_b_retain(box, "Text box");

		var labelX, labelY = dim.y,
			cnt = 0;

		for( var i=0 ; i<text.length ; i++ ) {
			var p = text[i].replace(/[\{\}]/g,""),
				plainWords = p.match(_b_plainWords),
				fullWords = p.match(_b_WordsWithPunctuation),
				words = [],
				labelX = dim.x;

			labelY -= lineHeight;

			cc.assert(plainWords.length === fullWords.length, "Number of words doesn't match between _pureWords and _fullWords.");

			for( var j=0 ; j<plainWords.length ; j++ ) {

				// create word sprite 
				var label = new cc.LabelBMFont( fullWords[j] , "res/fonts/indieflower50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT );
				//var label = this._label = cc.LabelTTF.create(fullWords[j], _b_getFontName(res.indieflower_ttf), fontSize, undefined,cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
				
				var word = {label: label, full:fullWords[j], plain:plainWords[j], pos:cc.p(labelX, labelY), status: {added: false, color: cc.color(0,0,0), opacity: 255} };
				words.push(word);

				label.setColor(word.status.color);
				label.setOpacity(word.status.opacity);
				label.setPosition(cc.p(labelX+label.width/2, labelY));
				if( cnt < 100 ) {
					box.addChild(label,20);
					word.status.added = true;
					_b_retain(label,"Word "+plainWords[j]);
				}

				// handle words that are add and words that are not
				// add background
				// add scrolling:

				labelX += label.width; 
				if(labelX > dim.x + dim.width ) {
					labelX = dim.x;
					labelY -= lineHeight;
				}

				cnt++;
			}

			if( words.length ) this._paragraphs.push(words);

			// add up length
		}

		cc.log("Baking "+cnt+" words");
		box.bake();

		// create paper images

	},


});	

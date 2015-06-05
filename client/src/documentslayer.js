// DocumentsLayer
// 
// The documents layer file contains documents for the collectors booklet 


// DocumentsLayer Constants
//
//

var _B_DOCUMENT_BOX = cc.rect(50, 50, 800, 0);

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

	_paragraphs: [];
	_textStatus: [];
	_box: null;

	// ctor initializes sprite cache
	//
    ctor: function(text, fontSize, lineHeight) {
        this._super();  
        
	    cc.spriteFrameCache.addSpriteFrames(res.documents_plist);	  

		this._box = _B_DOCUMENT_BOX;

		for( var i=0 ; i<text.length ; i++ ) {
			var p = text[i],
				plainWords = p.match(_b_plainWords),
				fullWords = p.match(_b_WordsWithPunctuation),
				words = [];

			cc.assert(pureWords.length === fullWords.length, "Number of words doesn't match between _pureWords and _fullWords.");

			for( var j=0 ; j<plainWords.length ; j++ ) {
				words.push({full:fullWords[j], plain:plainWords[j], status: {color: cc.color(0,0,0), opacity: 255} });

				// create word sprite, 
				// determine width, 
				// set x,y according to last word, 
				// add sprite to layer
				//
			}

			if( words.length ) this._paragraphs.push(words);

			// add up length
		}

		// create paper images

	},


});	

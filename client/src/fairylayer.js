// FairyLayer
// 
// The fairy layer file contains fairies with the ability to speak, think, give options etc.


// GameFairyLayer Constants
//
var _B_FAIRY_LEFT = 0,
	_B_FAIRY_RIGHT = 1;

// FairyLayer is the base class for all fairies
//
// Methods
// -------
// show inits the player selection menu and shows the bar
// hide removes bar and available players
// initListener starts touch events of the title layer
// stopListener stops touch events 
//
// Properties
// ----------
//
var FairyLayer = cc.Layer.extend({
	_fairy: null,
	_gestures: null,
	_currentGesture: null,
	_speechbubble: null,

	// ctor initializes sprite cache
	//
    ctor: function(fairyName, gestures) {
        this._super();  

		cc.assert(fairyName && typeof fairyName === "string", "I need a name of a fairy.");
		cc.assert(gestures && gestures[0], "I need at least one gesture element.");
	
		this._fairyName = fairyName;
		this._gestures = gestures;
		this._currentGesture = 0;
		        
	    cc.spriteFrameCache.addSpriteFrames(res.fairies_plist);	    
	},
	
	// show displays a fairy
	//
	// Parameter:
	//
	// parent: the parent layer
	// fairy: sprite name of a fairy
	// gestures: the different gestures of the fairy, with x,y,width,height,orientation 
	//
	show: function() {
	
		var self = this,
			g = this._gestures[this._currentGesture];
		
        //////////////////////////////
        // Start event handling
	    this.initListeners();

        //////////////////////////////
        // Create fairy and set her to position 1
		var fairy = this._fairy = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(this._fairyName),cc.rect(0,0,g.width,g.height));
		fairy.setPosition(cc.p(g.x,g.y));
		fairy.setOpacity(0);

		this.addChild(fairy,0);
		_b_retain(this._fairy,"FairyLayer, show, _fairy");

		fairy.runAction(
			cc.fadeIn(2)
		);
		this.initListeners();
	},
	
	say: function(text, cb) {

		var self = this,
			g = this._gestures[this._currentGesture];
		
		var bubble = new SpeechBubble(text, 1, g.bubblePoint, cb);

		this.addChild(bubble,10);
	},
	
	// hide hides the list and stops the invitation episode
	hide: function(player) {
		_b_release(this._fairy);
		this.addChild(this._fairy);
    			    	
	    this.stopListeners();	    
	},
	
	// initListeners start the event handling
	initListeners: function() {
		var self = this;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {},
			onTouchesMoved: function(touches, event) {},
			onTouchesEnded: function(touches, event){

				var touch = touches[0],
					loc = touch.getLocation();	            		

				// self.hide();		
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
		
	// stopListeners stops the event handling
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    },    
});

// SpeechBubble is the class for speech bubbles for fairies
//
// Methods
// -------
//
// Properties
// ----------
//
var SpeechBubble = cc.Sprite.extend({
	_finalCallback: null,

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(text, id, point, cb) {
    	cc.assert( id, "I need a sprite id.");
    	cc.assert(cb && typeof cb === "function", "I need a callback function.");
    
        this._super(cc.spriteFrameCache.getSpriteFrame("bubble"+id),cc.rect(0,0,493,400));    
        
        this._finalCallback = cb;
        
        this.setAnchorPoint(1,0);
	}
});

// GameFairyLayer is the class for game fairies
//
// Methods
// -------
//
// Properties
// ----------
//
var GameFairy = FairyLayer.extend({

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function() {
        this._super("sphinx",[{
        	x: 970,
        	y: 160,
        	width: 383,
        	height: 320,
        	orientation: _B_FAIRY_LEFT,
        	bubblePoint: {
        		x: -100,
        		y: 100
        	}
        }]);
	}
});


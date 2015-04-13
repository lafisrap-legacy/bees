// FairyLayer
// 
// The fairy layer file contains fairies with the ability to speak, think, give options etc.


// GameFairyLayer Constants
//
var _B_FAIRY_LEFT = 1,
	_B_FAIRY_RIGHT = -1;

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
			cg = this._currentGesture;
			g = this._gestures[cg];
		
        //////////////////////////////
        // Start event handling
	    this.initListeners();

        //////////////////////////////
        // Create fairy and set her to position 1
		var fairy = this._fairy = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(g.sprite));
		fairy.setPosition(cc.p(g.x,g.y));
		fairy.setScale(g.orientation,1);

		this.addChild(fairy,0);
		_b_retain(this._fairy,"FairyLayer, show, _fairy");
		
		this.appear();

		this.initListeners();
	},
	
	appear: function() {
		this._fairy.setOpacity(0);
		this._fairy.runAction(
			cc.fadeIn(2)
		);
	},
	
	say: function(time, text, cb) {

		var self = this,
			g = this._gestures[this._currentGesture];
		
		var bubble = new SpeechBubble(time, text, g, cb);

		this._fairy.addChild(bubble,10);
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
	_bubbles: {
		"angry": {
			sprite: "bubble1",
			ax: 0.6,
			ay: 0.0,
			padding: {
				top: 0,
				left: 50,
				right: 30,
				bottom: 60
			},
			color: cc.color(64,0,0,255)
		},
		"nice": {
			sprite: "bubble2",
			ax: 0.5,
			ay: 0.0,
			padding: {
				top: 50,
				left: 30,
				right: 30,
				bottom: 50
			},
			color: cc.color(0,0,0,255)
		},
	},

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(time, text, gesture, cb) {
    	var self = this,
    		gb = gesture.bubble,			// gb is how the gesture would like to have the bubble (variables)
    		bb = this._bubbles[gb.type];	// bb is how the bubble itself is defined (constants)
    
    	cc.assert(cb && typeof cb === "function", "I need a callback function.");
    
        cc.Sprite.prototype.ctor.call(this);
        this.initWithSpriteFrame(cc.spriteFrameCache.getSpriteFrame(bb.sprite));

        this._finalCallback = cb;
        this.setAnchorPoint(bb.ax, bb.ay);
        this.setPosition(cc.p(gb.x, gb.y));
        this.setCascadeOpacityEnabled(true);
        
        var text = cc.LabelTTF.create(text, "IndieFlower", gb.fontsize, cc.size(gb.width-bb.padding.left-bb.padding.right,0),cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
        text.setColor(bb.color);
        text.setPosition(cc.p(this.width/2,this.height/2+(bb.padding.bottom-bb.padding.top)/2));
        text.setScale(gesture.orientation, 1);
        var size = text.getContentSize();

		this.addChild(text);

        var scaleX = gb.width && gb.width/this.width || 1;
        var scaleY = gb.height && (gb.height+text.getContentSize().height/2)/this.height || 1;
        this.setScale(scaleX,scaleY);
        
		this.appear();
		
		if( time ) {
			setTimeout(function() {
				self.disappear();
			}, time*1000);
		}
	},
	
	appear: function() {
		this.setOpacity(0);
		this.runAction(
			cc.fadeIn(0.66)
		);
	},

	disappear: function() {
		var self = this;
		this.runAction(
			cc.sequence(
				cc.fadeOut(0.66),
				cc.callFunc(function() {
					self._finalCallback();
				})
			)
		);
	},
	
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

	// ctor 
	//
    ctor: function() {
        this._super("gamefairy",[{
        	sprite: "gamefairy1",
        	x: 120,
        	y: 160,
        	width: 251,
        	height: 320,
        	orientation: _B_FAIRY_LEFT,
        	bubble: {
        		type: "angry",
        		x: 340,
        		y: 280,
        		width: 500,
        		height: 200,
        		fontsize: 48,
        	},
        }]);
	},
	
	appear: function() {
		this._fairy.setOpacity(0);
		this._fairy.runAction(
			cc.fadeIn(2)
		);	
	}
});


// FairyLayer
// 
// The fairy layer file contains fairies with the ability to speak, think, give options etc.


// GameFairyLayer Constants
//
var _B_FAIRY_LEFT = 1,
	_B_FAIRY_RIGHT = -1,
	_B_GRABABLE_MASK_BIT = 1<<31,
	_B_NOT_GRABABLE_MASK = ~_B_GRABABLE_MASK_BIT;


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
	_space: null,
	_gestures: null,
	_currentGesture: null,
	_bubble: null,
	
	// event callbacks
	_onFairyIsClicked: null,

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
	    
		// Create the initial chipmonk space
        var space = this._space = new cp.Space();
		space.iterations = 60;
        space.gravity = cp.v(0, -500);
        space.sleepTimeThreshold = 0.5;
        space.collisionSlop = 0.5;

        this._debugNode = new cc.PhysicsDebugNode(this._space );
        this._debugNode.visible = true ;
        this.addChild( this._debugNode );
        // debug
                
        this.scheduleUpdate();
        
		this.cp_addWorldObjects();
	},
	
    update : function(dt) {
        this._space.step(dt);
    },
	
	// show displays a fairy
	//
	// Parameter:
	//
	// parent: the parent layer
	// fairy: sprite name of a fairy
	// gestures: the different gestures of the fairy, with x,y,width,height,orientation 
	//
	show: function(gesture) {
	
		var self = this,
			cg = gesture !== undefined? gesture : this._currentGesture || 0;
			g = this._gestures[cg];
		
	    // if it shows a fairy, let her disappear ...
	    if( this._fairy ) this.hide();

        //////////////////////////////
        // Create fairy and set her to position 1
		var fairy = this._fairy = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame(g.sprite));
		fairy.setPosition(cc.p(g.x,g.y));
		fairy.setScale(g.orientation,1);

		this.addChild(fairy,0);
		_b_retain(this._fairy,"FairyLayer, show, _fairy");
		
		this.appear();
		
		this._currentGesture = cg;

		this.initListeners();
		
		bomb1 = new Bomb(this._space, cc.p(200,600));
		bomb2 = new Bomb(this._space, cc.p(200,600));
		bomb3 = new Bomb(this._space, cc.p(200,600));
		this.addChild(bomb1);
		this.addChild(bomb2);
		this.addChild(bomb3);
		
		return this;
	},
	
	hide: function() {
		var self = this,
			fairy = this._fairy;
		
		this.disappear(function() {
			self.removeChild(fairy);		
			_b_release(fairy);
		});

		this._fairy = null;    			    	
	    this.stopListeners();	    
		
		return this;
	},
	
	appear: function() {
		this._fairy.setOpacity(0);
		this._fairy.runAction(
			cc.fadeIn(0.66)
		);
		
		return this;
	},
	
	disappear: function(cb) {
		this._fairy.runAction(
			cc.sequence(
				cc.fadeOut(1.5),
				cc.callFunc(function() {
					if(cb) cb();
				})
			)
		);
		
		return this;
	},
	
	say: function(waitTime, stayTime, text) {

		var self = this,
			g = this._gestures[this._currentGesture];
		
		this._timeout = setTimeout(function() {

			if(self._bubble) {
				self._fairy.removeChild(self._bubble);
				_b_release(self._bubble);
			}
				
			self._bubble = new SpeechBubble(stayTime, text, g);

			self._fairy.addChild(self._bubble,10);	
			_b_retain(self._bubble, "FairyLayer, bubble");					
		}, (waitTime||0)*1000);
		
		return this;
	},
	
	silent: function() {
		var self = this;
	
		if( this._bubble ) {
			this._bubble.disappear(function() {
				self._fairy.removeChild(self._bubble);
				_b_release(self._bubble);				
			});
		} else if( this._timeout ) {
			clearTimeout(this._timeout);
			this._timeout = null;
		}
		
		return this;
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
					loc = touch.getLocation(),
					fairyRect = self._fairy.getBoundingBox(),
					bubbleRect = self._bubble && self._bubble.getBoundingBox();
				
				if( cc.rectContainsPoint(fairyRect, loc) ) cc.eventManager.dispatchCustomEvent("fairy_is_clicked", this);					
				if( bubbleRect && cc.rectContainsPoint(bubbleRect, loc) ) cc.eventManager.dispatchCustomEvent("bubble_is_clicked", this);		
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
		
	// stopListeners stops the event handling
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    },    
    
    // chipmonk addons
	cp_addWorldObjects: function() {
        var space = this._space;
        var floor = space.addShape(new cp.SegmentShape(space.staticBody, cp.v(0, 30), cp.v(1136, -30), 0));
        floor.setElasticity(0.4);
        floor.setFriction(0.2);
        floor.setLayers(_B_NOT_GRABABLE_MASK);
        
        var stopper = space.addShape(new cp.SegmentShape(space.staticBody, cp.v(568, 30), cp.v(568, 100), 0));        
        stopper.setFriction(0.1);
        stopper.setElasticity(0.3);
        stopper.setLayers(_B_NOT_GRABABLE_MASK);
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
	_timeout: null,
	
	_bubbles: {
		"strong": {
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
			ax: 0.6,
			ay: 0.0,
			padding: {
				top: 20,
				left: 50,
				right: 30,
				bottom: 20
			},
			color: cc.color(0,0,0,255)
		},
	},

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(time, text, gesture) {
    	var self = this,
    		gb = gesture.bubble,			// gb is how the gesture would like to have the bubble (variables)
    		bb = this._bubbles[gb.type];	// bb is how the bubble itself is defined (constants)
    
        cc.Sprite.prototype.ctor.call(this);
        this.initWithSpriteFrame(cc.spriteFrameCache.getSpriteFrame(bb.sprite));

        this.setAnchorPoint(bb.ax, bb.ay);
        this.setPosition(cc.p(gb.x, gb.y));
        this.setCascadeOpacityEnabled(true);
        
        var text = cc.LabelTTF.create(text, _b_getFontName(res.indieflower_ttf), gb.fontsize, cc.size(gb.width-bb.padding.left-bb.padding.right,0),cc.TEXT_ALIGNMENT_CENTER, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
        text.setColor(bb.color);
        text.setPosition(cc.p(this.width/2,this.height/2+(bb.padding.bottom-bb.padding.top)/2));
        var size = text.getContentSize();

		this.addChild(text);

        var scaleX = gb.width && gb.width/this.width || 1;
        var scaleY = gb.height && (gb.height+text.getContentSize().height/2)/this.height || 1;
        this.setScale(scaleX,scaleY);
        text.setScale(gesture.orientation / scaleX, 1 / scaleY);
        
		this.appear();
		
		if( time && time > 0 ) {
			this._timeout = setTimeout(function() {
				self.disappear();
				self._timeout = null;
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

		if( this._timeout ) {
			clearTimeout(self._timeout);
			this._timeout = null;
		}

		this.runAction(
			cc.fadeOut(0.66)
		);
	},
	
});

// Hourglass is the class for hourglasses
//
// Methods
// -------
//
// Properties
// ----------
//
var Hourglass = cc.Sprite.extend({
	_b_label: [],
	_b_pos: null,

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(pos) {
    	cc.assert(pos, "I need a position for the hourglass.")
    	
        cc.Sprite.prototype.ctor.call(this);

        this.initWithSpriteFrame(cc.spriteFrameCache.getSpriteFrame("hourglass"));
        
        this.setPosition(pos);
        this.setCascadeOpacityEnabled(true);

		var label1 = this._b_label[0] = cc.LabelBMFont.create( "." , "res/fonts/hourglass140.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
		var label2 = this._b_label[1] = cc.LabelBMFont.create( "" , "res/fonts/hourglass140.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
		label1.setPosition(cc.p(this.width/2, 50));
		label2.setPosition(cc.p(this.width/2, 50));
		this.addChild(label1);
		this.addChild(label2);
		_b_retain(label1,"Hourglass: label1");		
		_b_retain(label2,"Hourglass: label2");		

		this.setOpacity(0);
	},
	
	onExit: function() {
		_b_release(this._b_label[0]);		
		_b_release(this._b_label[1]);
	},
	
	show: function() {

		var label = this._b_label;

		this.stopAllActions();
		label[0].stopAllActions();
		label[0].setString(".");
		label[0].setOpacity(255);
		label[0].runAction(cc.blink(30,60));

		label[1].stopAllActions();
		label[1].setString("");
		label[1].setOpacity(0);
		
		this.appear();	
		this.initListeners();	
	},
	
	hide: function() {
		this.disappear();
		this.stopListeners();	
	},
	
	appear: function() {
		this.runAction(
			cc.fadeIn(0.66)
		);
	},

	disappear: function(cb) {
		this.runAction(
			cc.sequence(
				cc.fadeOut(0.66),
				cc.callFunc(function() {
					if(cb) cb();
				})
			)
		);
	},
	
	countdown: function(seconds) {
		var self = this,
			label = this._b_label,
			cl = 0;
			
		seconds = Math.floor(seconds)+1;
		
		label[0].stopAllActions();
		label[1].stopAllActions();
		label[0].setOpacity(255);
		label[1].setOpacity(0);
		this._countdownInterval = setInterval(function() {
			--seconds;
			if( seconds >= 0 ) {
				label[cl].setString(seconds);
				cc.log("Setting hourglass to "+seconds+" in slot "+cl);
				label[cl].setOpacity(0);
				label[1-cl].runAction(
					cc.EaseSineOut.create(
						cc.fadeOut(1)
					)
				);
				label[cl].runAction(
					cc.EaseSineIn.create(
						cc.fadeIn(0.66)
					)
				);
				cl = 1-cl;
			} else {
				clearInterval(self._countdownInterval);
				this._countdownInterval = null;
				self.hide();
				cc.eventManager.dispatchCustomEvent("countdown_finished", this);					
			}
		},1000);
	},
	
	clearCountdown: function() {
		if( this._countdownInterval ) {
			clearInterval(this._countdownInterval);
			this._countdownInterval = null;
			this.disappear();
		}
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
					loc = touch.getLocation(),
					rect = self.getBoundingBox();
					
				if( cc.rectContainsPoint(rect, loc) ) {
					cc.eventManager.dispatchCustomEvent("hourglass_is_clicked", this);		
				}							
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
	
	// stopListeners stops the event handling
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
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

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(space, pos) {
        cc.PhysicsSprite.prototype.ctor.call(this);

        this.initWithSpriteFrame(cc.spriteFrameCache.getSpriteFrame("bomb"));
		this.setAnchorPoint(0.50,0.42);
		var radius = 50;
		mass = 30;
		var bomb = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0)))),
			circle = space.addShape(new cp.CircleShape(bomb, radius, cp.v(0, 0)));
		circle.setElasticity(0.5);
		circle.setFriction(10);
		
		this.setBody(bomb);
        this.setPosition(pos);
        this.setCascadeOpacityEnabled(true);
	},
	
	onExit: function() {
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
        	x: 1020,
        	y: 160,
        	width: 251,
        	height: 320,
        	orientation: _B_FAIRY_RIGHT,
        	bubble: {
        		type: "nice",
        		x: 360,
        		y: 260,
        		width: 500,
        		height: 300,
        		fontsize: 48,
        	},
        },{
        	sprite: "gamefairy2",
        	x: 1020,
        	y: 160,
        	width: 251,
        	height: 320,
        	orientation: _B_FAIRY_RIGHT,
        	bubble: {
        		type: "strong",
        		x: 340,
        		y: 260,
        		width: 500,
        		height: 300,
        		fontsize: 48,
        	},
        },{
        	sprite: "gamefairy3",
        	x: 1020,
        	y: 160,
        	width: 251,
        	height: 320,
        	orientation: _B_FAIRY_RIGHT,
        	bubble: {
        		type: "strong",
        		x: 340,
        		y: 260,
        		width: 500,
        		height: 300,
        		fontsize: 48,
        	},
        },{
        	sprite: "gamefairy4",
        	x: 1020,
        	y: 160,
        	width: 251,
        	height: 320,
        	orientation: _B_FAIRY_RIGHT,
        	bubble: {
        		type: "strong",
        		x: 340,
        		y: 260,
        		width: 500,
        		height: 300,
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


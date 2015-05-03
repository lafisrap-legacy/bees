// FairyLayer
// 
// The fairy layer file contains fairies with the ability to speak, think, give options etc.


// GameFairyLayer Constants
//
var _B_FAIRY_LEFT = 1,
	_B_FAIRY_RIGHT = -1,
	_B_GRABABLE_MASK_BIT = 1<<31,
	_B_NOT_GRABABLE_MASK = ~_B_GRABABLE_MASK_BIT,

	_B_COLL_TYPE_STATIC = 1,
	_B_COLL_TYPE_OBJECT = 2;


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
	_objects: [],
	_draggedObject: null,
	
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

        //this._debugNode = new cc.PhysicsDebugNode(this._space );
        //this._debugNode.visible = true ;
        //this.addChild( this._debugNode );
        // debug
                
        this.scheduleUpdate();
        
		this.initListeners();
        
		this.cp_addWorldObjects();
	},
	
	onExit: function() {
	    cc.Layer.prototype.onExit.call(this);

		this.stopListeners();	    
	},
	
    update : function(dt) {
		var dob = this._draggedObject;

		if( dob && dob.dragging ) dob.dragging();

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
	
	addObject: function(obj) {		
		this._objects.push(obj);
		this.addChild(obj);
		_b_retain(obj,"Fairy object");
	},
	
	removeObject: function(obj) {
		var index = this._objects.indexOf(obj);
		
		if( index > -1 ) {
			this._objects.splice(index, 1);
			this.removeChild(obj);
			_b_release(obj);
		}
		else cc.assert(false, "Couldn't find fairy object in list.");
	},
	
	// initListeners start the event handling
	initListeners: function() {
		var self = this,
			startTime = null,
			offset = null,
			lastTouch = null,
			lastEvent = null,
			bombFlies = false;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {
				var touch = touches[0],
					loc = touch.getLocation(),
					startTime = new Date().getTime();

				for( var i=0, objs = self._objects ; objs && i<objs.length ; i++ ) {
					var o = objs[i],
						pos = o.getPosition();
						
					if( cp.v.dist(pos, loc) < o.width ) {
				        var drawNode = cc.DrawNode.create();
						drawNode.clear();
						drawNode.drawCircle(cc.p(pos.x,pos.y),o.width/2,0,32,false,1,new cc.Color(255,0,0,100));
						self.addChild(drawNode,20);

						cc.eventManager.dispatchCustomEvent("object_touches_began", o);
						self._draggedObject = o;
						o.draggingPos = {
							x: loc.x,
							y: loc.y
						};
						o.getBody().setAngVel(0.0);
						o.getBody().setAngle(0.0);
						offset = {
							x: loc.x - pos.x,
							y: loc.y - pos.y
						};
						//cc.log("FairyLayer: Start dragging bomb "+i+". offset.x:"+offset.x+", offset.y:"+offset.y);
						break;
					}					
				}
			},
			onTouchesMoved: function(touches, event) {
				var touch = touches[0],
					loc = touch.getLocation(),
					dob = self._draggedObject;
					
				lastTouch = touches;
				lastEvent = event;
				
				if(dob) {
					dob.draggingPos = {
						x: loc.x-offset.x,
						y: loc.y-offset.y
					}
				}
			},
			onTouchesEnded: function(touches, event){
				cc.log("onTouchesEnded: "+self._draggedObject);

				var	touch = touches[0],
					loc = touch.getLocation(),
					dob = self._draggedObject,
					fairyRect = self._fairy && self._fairy.getBoundingBox() || null,
					bubbleRect = self._bubble && self._bubble && self._bubble.getBoundingBox() || null;

				if( !dob ) {				
					if( fairyRect && cc.rectContainsPoint(fairyRect, loc) ) cc.eventManager.dispatchCustomEvent("fairy_is_clicked", this);					
					if( bubbleRect && cc.rectContainsPoint(bubbleRect, loc) ) cc.eventManager.dispatchCustomEvent("bubble_is_clicked", this);	
				} else {
					self._draggedObject.land();
					self._draggedObject = null;
					cc.log("Letting the object go ...");
				}
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
		
	// stopListeners stops the event handling
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
        cc.log("FairyLayer: Stop listening!");

    },    
    
    // chipmonk addons
	cp_addWorldObjects: function() {
        var self = this,
			space = this._space;
        var floorLeft = space.addShape(new cp.SegmentShape(space.staticBody, cp.v(0, 40), cp.v(668, 0), 0));
        floorLeft.setElasticity(0.4);
        floorLeft.setFriction(0.2);
        floorLeft.setLayers(_B_NOT_GRABABLE_MASK);
		floorLeft.setCollisionType(1);
        
        var floorRight = space.addShape(new cp.SegmentShape(space.staticBody, cp.v(668, 0), cp.v(1136, 0), 0));        
        floorRight.setFriction(0.1);
        floorRight.setElasticity(0.3);
        floorRight.setLayers(_B_NOT_GRABABLE_MASK);
		floorRight.setCollisionType(1);
        
		var stopperLeft = space.addShape(new cp.SegmentShape(space.staticBody, cp.v(0, 0), cp.v(0, 640), 0));        
        stopperLeft.setFriction(0.1);
        stopperLeft.setElasticity(0.3);
        stopperLeft.setLayers(_B_NOT_GRABABLE_MASK);
		stopperLeft.setCollisionType(1);

        var stopperRight = space.addShape(new cp.SegmentShape(space.staticBody, cp.v(1136, 0), cp.v(1136, 640), 0));        
        stopperRight.setFriction(0.1);
        stopperRight.setElasticity(0.3);
        stopperRight.setLayers(_B_NOT_GRABABLE_MASK);
		stopperRight.setCollisionType(_B_COLL_TYPE_STATIC);

		space.addCollisionHandler(_B_COLL_TYPE_OBJECT,_B_COLL_TYPE_OBJECT,function(arb, space, data) {
			if( self._draggedObject ) {
				var body = self._draggedObject.getBody();

				if( body === arb.body_a || body === arb.body_b ) return false;  // no collision if the dragged object collides with other objects
			}
			cc.log("Two objects touched!");
			return true;
		},null,null,null);	

		space.addCollisionHandler(_B_COLL_TYPE_OBJECT,_B_COLL_TYPE_STATIC,function(arb, space, data) {
			if( self._draggedObject ) {
				var body = self._draggedObject.getBody();

				if( body === arb.body_a || body === arb.body_b ) return false;  // no collision if the dragged object collides with other objects
			}
			cc.log("Object touched wall!");
			return true;
		},null,null,null);	
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
var Hourglass = cc.PhysicsSprite.extend({
	_space: null,
	_hourglass: null,
	_shape: null,
	_b_label: [],
	_b_pos: null,
	

	// ctor calls the parent class with appropriate parameter
	//
    ctor: function(space, pos) {
    	cc.assert(pos, "I need a position for the hourglass.");
    	
    	this._space = space;
    	
        cc.PhysicsSprite.prototype.ctor.call(this);

        this.initWithSpriteFrame(cc.spriteFrameCache.getSpriteFrame("hourglass"));
		this.setAnchorPoint(0.50,0.5);
		var width = 120,
			height = 220,
			mass = 300,
			hourglass = this._hourglass = space.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height))),
			box = this._shape = space.addShape(new cp.BoxShape(hourglass, width, height));
		box.setElasticity(0.1);
		box.setFriction(3);
		
		this.setBody(hourglass);
        
        this.setPosition(pos);
        this.setCascadeOpacityEnabled(true);

		var label1 = this._b_label[0] = new cc.LabelBMFont( "." , "res/fonts/hourglass140.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
		var label2 = this._b_label[1] = new cc.LabelBMFont( "" , "res/fonts/hourglass140.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER );
		label1.setPosition(cc.p(this.width/2, 50));
		label2.setPosition(cc.p(this.width/2, 50));
		this.addChild(label1);
		this.addChild(label2);
		_b_retain(label1,"Hourglass: label1");		
		_b_retain(label2,"Hourglass: label2");		

		//this.setOpacity(0);
	},
	
	exit: function() {
		if( this._hourglass ) {
			this._space.removeBody(this._hourglass);
			this._space.removeShape(this._shape);
		}
	},

	onExit: function() {
        cc.PhysicsSprite.prototype.onExit.call(this);
	
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
	
	hide: function(cb) {
		this.disappear(cb);
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
				cc.fadeOut(0.33),
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
				cc.eventManager.dispatchCustomEvent("countdown_finished", this);					
				self.clearCountdown();
			}
		},1000);
	},
	
	clearCountdown: function() {
		if( this._countdownInterval ) {
			clearInterval(this._countdownInterval);
			this._countdownInterval = null;
			
			var label = this._b_label;		
			label[0].stopAllActions();
			label[1].stopAllActions();
			label[0].setOpacity(0);
			label[1].setOpacity(0);
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


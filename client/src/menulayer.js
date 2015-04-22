// MenuLayer Constants
//
var _B_MAX_MENU_ENTRIES = 6,					// maximum number of menu entries (depends on available pngs)
	_B_MAX_MENU_PADDING = -10,					// standard padding of menu pngs
	_B_MENU_Y_OFFSETS = [-4, -5, 2, 4, 8, 15];	// modifications of standard padding
	
cc.assert(_B_MENU_Y_OFFSETS.length === _B_MAX_MENU_ENTRIES, "MenuLayer: Array size of _B_MENU_Y_OFFSETS must match _B_MAX_MENU_ENTRIES.") 


// MenuLayer is the main menu layer of the game.
//
// Methods
// -------
// initListener starts touch events of the title layer
// stopListener stops touch events 
// show starts the menu in animation
// hide starts the menu out animation
//
// Properties
// ----------
// _finalCallback contains a pointer to the callback function that is called on menu hide
// _touchListener contains a pointer to the touch listeners of the event manager
//
var MenuLayer = cc.Layer.extend({

	_finalCallback: null,
	_touchListener: null,
	
    ctor: function () {
        this._super();
        
	    cc.spriteFrameCache.addSpriteFrames(res.menu_plist);
	},
	
	initListeners: function() {
		var self = this;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {},
			onTouchesMoved: function(touches, event) {},
			onTouchesEnded: function(touches, event){

				var touch = touches[0],
					loc = touch.getLocation();	            		

				// ignore location, hide anyway
				self.hide.call(self);		
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
		
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    },

    // show 
	//
    // Parameter
    //
    // labelsAndCallbacks is a object array with two properties
    //		label contains the label of the menu entry
    //		cb contains the callback function called when the menu is selected
    //
    //		example:
    //
	//		[{
	//			label: "Menu Entry One",
	//			cb: function() { 
	//				// ... code
	//			}
	//		},{
	//			label: "Menu Entry Two",
	//			cb: function() { 
	//				// ... code
	//			}
	//		}]		
	//
	// finalCallback is the final callback function. It is called after the menu is hidden again    
	show: function(labelsAndCallbacks, finalCallback) {
		
        var size = cc.winSize, gate, menu;
        			    
	    this.initListeners();
	    this._finalCallback = finalCallback;
	    cc.assert( this._finalCallback && typeof this._finalCallback == "function", "this._finalCallback should be a function.")
		
		// Create menu items from object
		var items = [];
		for( var i=0 ; i<Math.min(labelsAndCallbacks.length,_B_MAX_MENU_ENTRIES) ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("item"+(i+1)),
	    		spritesNormal = cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesSelected =cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesDisabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			var label = new cc.LabelBMFont( labelsAndCallbacks[i].label , "res/fonts/bees50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
			label.setPosition(cc.p(190,label.getContentSize().height-20));
			label.setColor(cc.color(222,160,160));
			spritesNormal.addChild(label, 5);	
			//spritesSelected.addChild(label, 5);	
			//spritesDisabled.addChild(label, 5);	

			var menuSprite = new cc.MenuItemSprite(spritesNormal, spritesSelected, spritesDisabled, labelsAndCallbacks[i].cb, this);
			items.push(menuSprite);
		}

		// Create, adjust and animate menu		
		this.menu = new cc.Menu(items);		
		cc.assert( this.menu, "Menu could not be created!");

		var ch = this.menu.children;
    	this.menu.setPosition(cc.p(1136 * 1.1,320));
	    this.menu.setScale(0.1);
		this.menu.alignItemsVerticallyWithPadding(_B_MAX_MENU_PADDING);
		for( var i=0 ; i<ch.length ; i++ ) ch[i].y = ch[i].y + _B_MENU_Y_OFFSETS[i];
		
		this.menu.runAction(cc.sequence(
			cc.delayTime(0.33),
			cc.EaseElasticOut.create(
				cc.spawn(
					cc.scaleTo(2.5,1,1),
					cc.moveTo(2.5,930,250)
				)
			)
		));

		// Create, adjust and animate gate
		this.gate = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("gate"),cc.rect(0,0,1136,640)),
		this.gate.setPosition(cc.p(1136*1.5,370));
		this.gate.setScale(1.15);
		this.gate.runAction(cc.EaseSineOut.create(
			cc.moveTo(1,568,360)
		));

		// Show menu and gate
        this.addChild(this.menu,1);
        this.addChild(this.gate,0);

        return true;
    },

    hide: function() {
    	var self = this;
    	
    	this.menu.runAction(cc.sequence(
    		cc.EaseSineIn.create(
    			cc.moveTo(1,1136*1.5, 320)
    		),
    		cc.callFunc(function() {
    			self.removeChild(self.menu);
    			self.removeChild(self.gate);
    			self.getParent().removeChild(self);
    			self._finalCallback();
    		})
    	));
    	
    	this.gate.runAction(cc.EaseSineIn.create(
    		cc.spawn(
	    		cc.moveTo(1,1136*1.5, 320),
	    		cc.scaleTo(1,1,1)
	    	)
	    ));
	    
	    this.stopListeners();
    }
});


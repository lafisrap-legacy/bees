// MenuLayer Constants
//
// _B_MAX_LISTVIEW_ENTRIES: maximum number of menu entries (depends on available pngs)
// _B_MAX_LISTVIEW_PADDING: standard padding of menu pngs
// _B_LISTVIEW_Y_OFFSETS: modifications of standard padding
//
var _B_MAX_LISTVIEW_ENTRIES = 6,
	_B_MAX_LISTVIEW_PADDING = -10,
	_B_LISTVIEW_Y_OFFSETS = [-4, -5, 2, 4, 8, 15];
	
cc.assert(_B_MENU_Y_OFFSETS.length === _B_MAX_MENU_ENTRIES, "MenuLayer: Array size of _B_MENU_Y_OFFSETS must match _B_MAX_MENU_ENTRIES.") 
// SelectPlayerLayer provides list views for the game.
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

var SelectPlayerLayer = cc.Layer.extend({
	_finalCallback: null,
	_currentLabels: null,
	_listview: null,

    ctor: function(finalCallback, labels) {
        this._super();  
        
        this._finalCallback = finalCallback;
	    cc.assert( this._finalCallback && typeof this._finalCallback == "function", "this._finalCallback should be a function.")

	    cc.spriteFrameCache.addSpriteFrames(res.listview_plist);
	    
	    		// Create, adjust and animate gate
		this.gate = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("gate"),cc.rect(0,0,1136,640)),
		this.gate.setPosition(cc.p(1136*0.5,370));
		this.gate.setScale(1.15);
		this.gate.runAction(cc.EaseSineOut.create(
			cc.moveTo(1,568,360)
		));
        this.addChild(this.gate, 5);

        this.show(labels);      
	},
	
	show: function(labels) {
		
		var self = this;
		
        var size = cc.winSize, gate, menu;
        			    
	    this.initListeners();
		
		// Create menu items from object
		this.initListview(labels);
		
		this._listview.runAction(cc.sequence(
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
		this.gate.setPosition(cc.p(1136*0.5,370));
		this.gate.setScale(1.15);
		this.gate.runAction(cc.EaseSineOut.create(
			cc.moveTo(1,568,360)
		));

		// Show menu and gate
        this.addChild(this.gate,0);
			
        $b.acceptInvitations(function(data) {
        	var labels = [];
			for( var i=0 ; i<data.length ; i++ ) {
				labels.push({
					label: data[i].name,
					inviting: data[i].inviting,
					invited: data[i].invited
				});
			}
			self.initListview(labels);
		});
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
	    	
		$b.sendCommand({command: "stopInvitations"}); 
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
    
    initListview: function(labels) {
    	var items = [],
    		l = this._currentLabels;
    	
    	// look if labels changed
    	for( var i=0 ; l && i<l.length ; i++ ) if( l[i] != labels[i].label ) break;
    	if( l && l.length == labels[i].length && i==l.length ) return;
    	
    	this._currentLabels = [];
		if( this._listview ) this.removeChild(this._listview);		
    	
		for( var i=0 ; i<Math.min(labels.length, _B_MAX_LISTVIEW_ENTRIES) ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("listviewitem"+(i+1)),
	    		spritesNormal = cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesSelected =cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesDisabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			var label = cc.LabelBMFont.create( labels[i].label , "res/fonts/amtype36.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
			label.setPosition(cc.p(190,label.getContentSize().height));
			label.setColor(cc.color(122,80,77,155));
			spritesNormal.addChild(label, 5);	
			//spritesSelected.addChild(label, 5);	
			//spritesDisabled.addChild(label, 5);	

			var listviewSprite = new cc.MenuItemSprite(spritesNormal, spritesSelected, spritesDisabled, this._finalCallback, labels[i]);
			items.push(listviewSprite);
		}

		// Create and adjust menu		
		this._listview = new cc.Menu(items);		
		cc.assert( this._listview, "Listview could not be created!");

		var ch = this._listview.children;
    	this._listview.setPosition(cc.p(568,320));
	    this._listview.setScale(1);
		this._listview.alignItemsVerticallyWithPadding(_B_MAX_MENU_PADDING);
		for( var i=0 ; i<ch.length ; i++ ) ch[i].y = ch[i].y + _B_MENU_Y_OFFSETS[i];
		
		this.addChild(this._listview,1);
	}
});


// MenuLayer Constants
//
// _B_MAX_LISTVIEW_ENTRIES: maximum number of menu entries (depends on available pngs)
// _B_MAX_LISTVIEW_PADDING: standard padding of menu pngs
// _B_LISTVIEW_Y_OFFSETS: modifications of standard padding
//
var _B_MAX_LISTVIEW_ENTRIES = 6,
	_B_MAX_LISTVIEW_PADDING = -10,
	_B_LISTVIEW_Y_OFFSETS = [-4, -5, 2, 4, 8, 15],
	_B_BEESFONT_Y_OFFSET = -20;
	
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
	_height: 0,

    ctor: function(finalCallback, labels) {
        this._super();  
        
        this._finalCallback = finalCallback;
	    cc.assert( this._finalCallback && typeof this._finalCallback == "function", "this._finalCallback should be a function.")

	    cc.spriteFrameCache.addSpriteFrames(res.listview_plist);
	    
        this.show(labels);      
	},
	
	show: function(labels) {
		
		var self = this;
		
        var size = cc.winSize;
        			    
	    this.initListeners();
		
		// Create, adjust and animate bar
		var b = this._bar = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("bar"),cc.rect(0,0,550,115));
		b.setPosition(cc.p(cc.width/2,cc.height+50));
		b.setScale(2);
		b.runAction(
			cc.spawn(
				cc.EaseSineOut.create(
					cc.moveTo(0.33,size.width/2,size.height-100)
				),
				cc.scaleTo(0.33,1)
			)
		);
		var bl = this._BarLabel = cc.LabelBMFont.create( _b_t.playerlist.noplayers , "res/fonts/bees50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
		bl.setPosition(cc.p(275,75+_B_BEESFONT_Y_OFFSET));
		b.addChild(bl, 5);	
		_b_retain(this._BarLabel,"SelectPlayerLayer, show, _BarLabel")
        this.addChild(this._bar,0);
		
		// Create menu items from object
		this.initListview(labels);
		
		var lv = this.listview;
		if( lv ) {
			lv.setPosition(cc.p(size.width/2,size.height*1.3));
			lv.stopAllActions();
			lv.runAction(cc.sequence(
				cc.delayTime(0.33),
				cc.EaseElasticOut.create(
					cc.spawn(
						cc.scaleTo(1.5,1,1),
						cc.moveTo(1.5,size.width/2,size.height - this._height/2 - 180 )
					)
				)
			));
		}

        $b.acceptInvitations(function(data) {
			data.sort(function(a,b) { 
				return a.name != b.name? a.name > b.name : a.invited != b.invited? a.invited > b.invited : a.inviting > b.inviting; 
			});
			self.initListview(data);
		});
	},
	
	hide: function() {
    	var self = this;
    	
    	if( this._listview ) {
			this._listview.runAction(cc.sequence(
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
		}
		    	
    	this._bar.runAction(cc.EaseSineIn.create(
    		cc.spawn(
	    		cc.moveTo(1,1136*1.5, 320),
	    		cc.scaleTo(1,1,1)
	    	)
	    ));
	    
	    this.stopListeners();
	    
	    _b_release(this._BarLabel);
	    if( this._listview ) _b_release(this._listview);
	    	
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
    		cl = this._currentLabels;

    	this._currentLabels = labels;

    	// look if labels changed
    	for( var i=0 ; cl && cl.length == labels.length && i<cl.length ; i++ ) {
    		if( cl[i].name != labels[i].name || cl[i].invited != labels[i].invited || cl[i].inviting != labels[i].inviting ) break;
    	}
    	if( cl && cl.length == labels.length && i==cl.length ) return;
    	
		if( this._listview ) {
			this.removeChild(this._listview);
			_b_release(this._listview);
			this._listview = null;
		}
    	if( labels.length == 0 ) {
    		this._BarLabel.setCString(_b_t.playerlist.noplayers)
    		return
    	} else {
    		this._BarLabel.setCString(_b_t.playerlist.choose)
    	}
    	
		for( var i=0 ; i<Math.min(labels.length, _B_MAX_LISTVIEW_ENTRIES) ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("listviewitem"+(i+1)),
	    		spritesNormal = cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesSelected =cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesDisabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			var label = cc.LabelBMFont.create( labels[i].name , "res/fonts/bees50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
			label.setPosition(cc.p(190,label.getContentSize().height+_B_BEESFONT_Y_OFFSET));
			label.setColor(cc.color(200,130,140,255));
			spritesNormal.addChild(label, 5);	
			//spritesSelected.addChild(label, 5);	
			//spritesDisabled.addChild(label, 5);	
			
			// the following 4 lines has to move out of here into the show function, with retain
			var icon1 = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("invited"),cc.rect(0,0,64,64)),
				icon2 = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("inviting"),cc.rect(0,0,64,64));
			icon1.setPosition(cc.p(50,50));
			icon2.setPosition(cc.p(330,50));
			
			if( labels[i].invited == "yes" ) spritesNormal.addChild(icon1, 5);	
			if( labels[i].inviting == "yes" ) spritesNormal.addChild(icon2, 5);

			var listviewSprite = new cc.MenuItemSprite(spritesNormal, spritesSelected, spritesDisabled, this.onListviewTap, labels[i]);
			items.push(listviewSprite);
		}

		// Create and adjust menu		
		this._listview = new cc.Menu(items);		
		cc.assert( this._listview, "Listview could not be created!");

		this.addChild(this._listview,1);
		_b_retain(this._listview,"SelectPlayerLayer, initListview, _listview")

		var ch = this._listview.children;
		this._listview.alignItemsVerticallyWithPadding(_B_MAX_MENU_PADDING);
		this._listview.setPosition(cc.p(cc.width/2,cc.height - this._height/2 - 180));
		for( var i=0 ; i<ch.length ; i++ ) ch[i].y = ch[i].y + _B_MENU_Y_OFFSETS[i];
		
		this._height = ch[0].y + ch[0].height/2 - ch[i-1].y + ch[i-1].height/2;
		
		this._listview.runAction(
			cc.EaseSineOut.create(
				cc.moveTo(0.5,cc.width/2,cc.height - this._height/2 - 180)
			)
		)
	},
	
	onListviewTap: function() {
		if( this.invited == "yes" ) $b.disinvitePlayer(this.sid);
		else 						$b.invitePlayer(this.sid);
	}
});


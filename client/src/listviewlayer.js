// ListviewLayer
// 
// The listview layer file contains listviews like the player selection


// ListviewLayer Constants
//
// _B_MAX_LISTVIEW_ENTRIES: 
// _B_MAX_LISTVIEW_PADDING:
// _B_LISTVIEW_Y_OFFSETS: 
//
var _B_MAX_LISTVIEW_ENTRIES = 6, // maximum number of menu entries (depends on available pngs)
	_B_MAX_LISTVIEW_PADDING = -10, //  standard padding of menu pngs
	_B_LISTVIEW_Y_OFFSETS = [-4, -5, 2, 4, 8, 15], // modifications of standard padding
	_B_BEESFONT_Y_OFFSET = -20; // y correction of beesfont (should be done in beest cf someday)
	
cc.assert(_B_LISTVIEW_Y_OFFSETS.length === _B_MAX_LISTVIEW_ENTRIES, "ListviewLayer: Array size of _B_MENU_Y_OFFSETS must match _B_MAX_MENU_ENTRIES.") 

// SelectPlayerLayer provides the select player view for the game. It is not meant to be 
// created by games itself directly, but using $b.connectPlayer function
//
// Methods
// -------
// show inits the player selection menu and shows the bar
// hide removes bar and available players
// drawListview fills the currently available players
// onListviewTap callback call by click on a player bar
// initListener starts touch events of the title layer
// stopListener stops touch events 
//
// Properties
// ----------
// _selectPlayerCb contains a pointer to the callback function that is called on menu hide
// _currentPlayers holds the current player names and invite stati
// _listview contains a cc.menu with all available players
// _height is the current total height of all player bars
//
var SelectPlayerLayer = cc.Layer.extend({
	_selectPlayerCb: null,
	_updateGameCb: null,
	_currentPlayers: null,
	_listview: null,
	_height: 0,

	// ctor initializes sprite cache
	//
    ctor: function() {
        this._super();  
        
	    cc.spriteFrameCache.addSpriteFrames(res.listview_plist);	    
	},
	
	// show displays bar and player list
	//
	// Parameter:
	//
	// players is a list with the currently available players in current game variation
	// selectPlayerCb is a callback that is called when a player pair is found or on abort
	// updateGameCb is a callback over which the game communication will happen
	//
	show: function(players, selectPlayerCb, updateGameCb) {
		var self = this;
		
		cc.log("SelectPlayerLayer show ..........");

        //////////////////////////////
        // Set the callback functions
		this._selectPlayerCb = selectPlayerCb;
		this._updateGameCb = updateGameCb;
	    cc.assert( this._selectPlayerCb && typeof this._selectPlayerCb == "function", "this._selectPlayerCb should be a function.")
	    cc.assert( this._updateGameCb && typeof this._updateGameCb == "function", "this._updateGameCb should be a function.")

		cc.log("before init listeners ..........");

        //////////////////////////////
        // Start event handling
	    this.initListeners();

		cc.log("after init listeners ..........");
		
        //////////////////////////////
		// Create, adjust and animate main bar
		var bar = this._bar = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("bar"),cc.rect(0,0,550,115));
		bar.setPosition(cc.p(cc.width/2,cc.height+50));
		bar.setScale(2);
		bar.runAction(
			cc.spawn(
				cc.EaseSineOut.create(
					cc.moveTo(0.33,cc.width/2,cc.height-100)
				),
				cc.scaleTo(0.33,1)
			)
		);
		var bl = this._BarLabel = cc.LabelBMFont.create( _b_t.playerlist.noplayers , "res/fonts/bees50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
		bl.setPosition(cc.p(275,75+_B_BEESFONT_Y_OFFSET));
		bar.addChild(bl, 5);	
        this.addChild(bar,0);
		_b_retain(this._BarLabel,"SelectPlayerLayer, show, _BarLabel");
		_b_retain(this._bar,"SelectPlayerLayer, show, _bar");
		
        //////////////////////////////
		// Create menu items from object and animate them
		this.drawListview(players);
		var lv = this._listview;
		if( lv ) {
			lv.setPosition(cc.p(cc.width/2,cc.height*1.3));
			lv.stopAllActions();
			lv.runAction(cc.sequence(
				cc.delayTime(0.33),
				cc.EaseElasticOut.create(
					cc.spawn(
						cc.scaleTo(1.5,1,1),
						cc.moveTo(1.5,cc.width/2,cc.height - this._height/2 - 180 )
					)
				)
			));
		}

		// get invitations
        $b.acceptInvitations(function(data) {
			data.sort(function(a,b) { 
				return a.name != b.name? a.name > b.name : a.sid < b.sid; 
			});
			self.drawListview(data);
		});
	},
	
	// hide hides the list and stops the invitation episode
	hide: function(player) {
    	var self = this,
    		cp = this._currentPlayers;
    	
    	if( player ) {
    		// The position of the player in the listview might have changed, so we search for sid
    		var found = false;
    		for( var i=0 ; i<cp.length ; i++ ) {
    			if( cp[i].sid == player.sid ) {
    				found = true;
    				break;
    			}
    		}
			if( found ) {
				var sprite = this._listview.children[i];
				
				sprite.runAction(
					cc.EaseSineIn.create(
						cc.spawn(
							cc.scaleTo(2,3,3),
							cc.fadeOut(2)
						)
					)
				)				
			} else {
				cc.assert(false, "Selected player was not found in the list.");
			}
    	}
    	
    	if( this._listview ) {
			this._listview.runAction(
				cc.EaseSineIn.create(
					cc.fadeOut(2)
				)
			);
		}
		
    	this._bar.runAction(cc.EaseSineIn.create(
    		cc.spawn(
	    		cc.moveTo(1,cc.width/2, cc.height * 1.5),
	    		cc.scaleTo(1,1,1)
	    	)
	    ));
	    
		setTimeout(function() {
			cc.log("Calling final callback ...");
			self._selectPlayerCb(player);

			if( self._listview ) {
				cc.log("Remove listview ...");
				self.removeChild(self._listview);
				_b_release(self._listview);
			}			

			self.removeChild(self._bar);
			self.getParent().removeChild(self);
			_b_release(self._BarLabel);
			_b_release(self._bar);
		}, 2000);
		    	
	    this.stopListeners();	    

		$b.sendCommand({command: "stopInvitations"}); 
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

				// ignore location, hide anyway
				self.hide();		
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
		
	// stopListeners stops the event handling
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    },
    
    // drawListview creates a new list with available players every time something changes
    //
	// players is a list with the currently available players in current game variation
	//
    drawListview: function(players) {

    	var items = [],
    		cp = this._currentPlayers;

    	this._currentPlayers = players;

    	// look if something changed with players
    	for( var i=0 ; cp && cp.length == players.length && i<cp.length ; i++ ) {
    		if( cp[i].name != players[i].name || cp[i].invited != players[i].invited || cp[i].inviting != players[i].inviting ) break;
    	}
    	if( cp && cp.length == players.length && i==cp.length ) return;
    	
    	// first delete the old listview
		if( this._listview ) {
			this.removeChild(this._listview);
			_b_release(this._listview);
			this._listview = null;
		}

		// set the bar label
    	if( players.length == 0 ) {
    		this._BarLabel.setString(_b_t.playerlist.noplayers);
    		return
    	} else {
    		this._BarLabel.setString(_b_t.playerlist.choose);
    	}
    	
    	// build up the players list
		for( var i=0 ; i<Math.min(players.length, _B_MAX_LISTVIEW_ENTRIES) ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("listviewitem"+(i+1)),
	    		spritesNormal = cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesSelected =cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesDisabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			var label = cc.LabelBMFont.create( players[i].name , "res/fonts/bees50.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
			label.setPosition(cc.p(190,label.getContentSize().height+_B_BEESFONT_Y_OFFSET));
			label.setColor(cc.color(200,130,140,255));
			spritesNormal.addChild(label, 5);	
			spritesNormal.setCascadeOpacityEnabled(true);
			//spritesSelected.addChild(label, 5);	
			//spritesDisabled.addChild(label, 5);	
			
			var icon1 = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("invited"),cc.rect(0,0,64,64)),
				icon2 = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("inviting"),cc.rect(0,0,64,64));
			icon1.setPosition(cc.p(50,50));
			icon1.setScale(0.0)
			icon2.setPosition(cc.p(330,50));
			icon2.setScale(0.0)
			
			if( players[i].invited == "yes" ) {
				spritesNormal.addChild(icon1, 5);	
				icon1.runAction(
					cc.EaseSineIn.create(
						cc.scaleTo(0.33,1)
					)
				);
			}
			if( players[i].inviting == "yes" ) {
				spritesNormal.addChild(icon2, 5);	
				icon2.runAction(
					cc.EaseSineIn.create(
						cc.scaleTo(0.33,1)
					)
				);
			}
			var listviewSprite = new cc.MenuItemSprite(spritesNormal, spritesSelected, spritesDisabled, this.onListviewTap, { self: this, player: players[i] });
			
			items.push(listviewSprite);
		}

		// Create, adjust player list ...		
		this._listview = new cc.Menu(items);		
		cc.assert( this._listview, "Listview could not be created!");
		this.addChild(this._listview,1);
		_b_retain(this._listview,"SelectPlayerLayer, drawListview, _listview")
		var ch = this._listview.children;
		this._listview.alignItemsVerticallyWithPadding(_B_MAX_MENU_PADDING);
		this._listview.setPosition(cc.p(cc.width/2,cc.height - this._height/2 - 180));
		for( var i=0 ; i<ch.length ; i++ ) ch[i].y = ch[i].y + _B_MENU_Y_OFFSETS[i];
		
		//  ... and animate it
		this._height = ch[0].y + ch[0].height/2 - ch[i-1].y + ch[i-1].height/2;
		this._listview.runAction(
			cc.EaseSineOut.create(
				cc.moveTo(0.5,cc.width/2,cc.height - this._height/2 - 180)
			)
		)
	},
	
	// onListviewTap is called when a players taps on a name
	onListviewTap: function() {
		var tapInfo = this;
	
		if( tapInfo.player.invited == "yes" ) $b.disinvitePlayer(tapInfo.player.sid);
		else 								  $b.invitePlayer(tapInfo.player.sid, function(player) {
			tapInfo.self.hide(player);
		}, tapInfo.self._updateGameCb);
	}
});


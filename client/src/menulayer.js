var BEES_MAX_MENU_ENTRIES = 6,
	BEES_MAX_MENU_PADDING = -25,
	BEES_MENU_Y_OFFSETS = [-15, -8, 2, 4, 2, 2];
	
cc.assert(BEES_MENU_Y_OFFSETS.length === BEES_MAX_MENU_ENTRIES, "MenuLayer: Array size of BEES_MENU_Y_OFFSETS must match BEES_MAX_MENU_ENTRIES.") 

var MenuLayer = cc.Layer.extend({

    ctor: function () {
        this._super();
        
		// load sprites into cache
	    cc.spriteFrameCache.addSpriteFrames(res.menu_plist);
	},
	
	show: function(labelsAndCallbacks) {
		
        var size = cc.winSize;
		var items = [];
		
		for( var i=0 ; i<labelsAndCallbacks.length ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("item"+(i+1)),
	    		spritesNormal = cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesSelected =cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesDisabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			var label = cc.LabelBMFont.create( labelsAndCallbacks[i].label , "res/fonts/amtype36.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
			label.setPosition(cc.p(190,50+BEES_MENU_Y_OFFSETS[i]));
			label.setColor(cc.color(122,80,77,155));
			spritesNormal.addChild(label, 5);	
			//spritesSelected.addChild(label, 5);	
			//spritesDisabled.addChild(label, 5);	

			items.push(new cc.MenuItemSprite(spritesNormal, spritesSelected, spritesDisabled, labelsAndCallbacks[i].cb, this));			
		}
		
		var menu = new cc.Menu(items);		
		menu.alignItemsVerticallyWithPadding(BEES_MAX_MENU_PADDING);

        this.addChild(menu);
    	menu.setPosition(cc.p(size.width * 1.1,size.height/2));
	    menu.setScale(0.1);

		menu.runAction(cc.EaseElasticOut.create(
			cc.spawn(
				cc.scaleTo(2.5,0.85,0.85),
				cc.moveTo(2.5,570,200)
			)
		));

        return true;
    }
});


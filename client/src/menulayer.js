var BEES_MAX_MENU_ENTRIES = 6,
	BEES_MAX_MENU_PADDING = -10,
	BEES_MENU_Y_OFFSETS = [-4, -5, 2, 4, 8, 15];
	
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
		var gate;
		
		for( var i=0 ; i<labelsAndCallbacks.length ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("item"+(i+1)),
	    		spritesNormal = cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesSelected =cc.Sprite.create(frame,cc.rect(0,0,380,100)),
	    		spritesDisabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			var label = cc.LabelBMFont.create( labelsAndCallbacks[i].label , "res/fonts/amtype36.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_CENTER, cc.p(0, 0) );
			label.setPosition(cc.p(190,label.getContentSize().height));
			label.setColor(cc.color(122,80,77,155));
			spritesNormal.addChild(label, 5);	
			//spritesSelected.addChild(label, 5);	
			//spritesDisabled.addChild(label, 5);	

			var menuSprite = new cc.MenuItemSprite(spritesNormal, spritesSelected, spritesDisabled, labelsAndCallbacks[i].cb, this);
			items.push(menuSprite);
		}
		
		var menu = new cc.Menu(items);		
		menu.alignItemsVerticallyWithPadding(BEES_MAX_MENU_PADDING);

		var ch = menu.children;
		for( var i=0 ; i<ch.length ; i++ ) {
			ch[i].y = ch[i].y + BEES_MENU_Y_OFFSETS[i];
		}
		
        this.addChild(menu,1);
    	menu.setPosition(cc.p(size.width * 1.1,size.height/2));
	    menu.setScale(0.1);

		menu.runAction(cc.sequence(
			cc.delayTime(0.33),
			cc.EaseElasticOut.create(
				cc.spawn(
					cc.scaleTo(2.5,1,1),
					cc.moveTo(2.5,930,250)
				)
			)
		));

		// creating gate		
		this.gate = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("gate"),cc.rect(0,0,1136,640)),
		this.gate.setPosition(cc.p(1136*1.5,370));
		this.gate.setScale(1.15);
		
		this.gate.runAction(cc.EaseSineOut.create(
			cc.moveTo(1,568,360)
		));
        this.addChild(this.gate,0);

        return true;
    }
});


var BEES_MAX_MENU_ENTRIES = 6;

var MenuLayer = cc.Layer.extend({

	onMenuCallback: function(sender) {
		cc.log("Menu call back: "+sender);
	},
    ctor:function () {
        this._super();
        
        var size = cc.winSize;

		// load sprites into cache
	    cc.spriteFrameCache.addSpriteFrames(res.menu_plist);

		var items = [];
		for( var i=0 ; i<BEES_MAX_MENU_ENTRIES ; i++ ) {
			var frame = cc.spriteFrameCache.getSpriteFrame("item"+(i+1));
	    	var sprite = cc.Sprite.create(frame,cc.rect(0,0,380,100));
	    	var sprite_selected =cc.Sprite.create(frame,cc.rect(0,0,380,100));
	    	var sprite_disabled =cc.Sprite.create(frame,cc.rect(0,0,380,100));

			items.push(new cc.MenuItemSprite(sprite, sprite_selected, sprite_disabled, this.onMenuCallback, this));
		}
		
		var menu = new cc.Menu(items[0],items[1],items[2],items[3],items[4],items[5]);		
		menu.alignItemsVerticallyWithPadding(-25);

        this.addChild(menu);
    	menu.setPosition(cc.p(size.width * 1.1,size.height/2));
	    menu.setScale(0.1);

		menu.runAction(cc.sequence(
			cc.spawn(
				cc.scaleTo(2,0.75,0.75),
				cc.moveTo(2,size.width/2,size.height/2)
			),
			cc.scaleTo(2,1,1)
		));

        return true;
    }
});


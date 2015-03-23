
var HelloWorldLayer = cc.Layer.extend({
    sprite:null,
    ctor:function () {
        //////////////////////////////
        // 1. super init first
        this._super();

        var size = cc.winSize;

        /////////////////////////////
        // 3. add your codes below...
        // add a label shows "Hello World"
        // create and initialize a label
        this.text = new cc.Node();
        this.text.attr({
            x: 0,
            y: 0,
        });
        this.addChild(this.text, 0);

		var label1 = cc.LabelBMFont.create( "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ" , "res/bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
		var label2 = cc.LabelBMFont.create( "abcdefghijklmnopqrstuvwxyzäöü" , "res/bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
		var label3 = cc.LabelBMFont.create( "&(),!#-%+.?/*" , "res/bees.fnt" , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
        // position the label on the center of the screen
        label1.x = label1.width/2;
        label1.y = size.height-label1.height/2;
        label2.x = label2.width/2;
        label2.y = size.height-label1.height/2-label2.height;
        label3.x = label3.width/2;
        label3.y = size.height-label1.height/2-label2.height-label3.height;
        // add the label as a child to this layer
        this.text.addChild(label1, 5);
        this.text.addChild(label2, 5);
        this.text.addChild(label3, 5);
        this.text.x = cc.sys.localStorage.getItem('textPosX') || 0;            		
        this.text.y = cc.sys.localStorage.getItem('textPosY') || 0;            		

        
        this.initListeners();

        return true;
    },
    
    initListeners: function() {
		var self = this;
		self.startOffset = null;
	
		this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {
				var touch = touches[0];
				
				self.startOffset = touch.getLocation();
				
				self.startOffset.x -= self.text.x;	       		
				self.startOffset.y -= self.text.y;	    
			},
			onTouchesMoved: function(touches, event) {
			
				if( self.startOffset != null ) {
					var touch = touches[0],
						loc = touch.getLocation();	
				
					self.text.x = loc.x - self.startOffset.x;            		
					self.text.y = loc.y - self.startOffset.y;            		
				}
			},
			onTouchesEnded: function(touches, event){

				var touch = touches[0],
					loc = touch.getLocation();	
					
				startOffset = null;     
									
				cc.sys.localStorage.setItem('textPosX', self.text.x);            		
				cc.sys.localStorage.setItem('textPosY', self.text.y);            		
			}
		});
			
		cc.eventManager.addListener(this._touchListener, this);
	},
	
	stopListeners: function() {
        if( this._touchListener ) cc.eventManager.removeListener(this._touchListener);
    }
});

var HelloWorldScene = cc.Scene.extend({
    onEnter:function () {
        this._super();
        var layer = new HelloWorldLayer();
        this.addChild(layer);
    }
});


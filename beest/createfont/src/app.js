var _FONT_ = "res/beesfont/bees50.fnt"

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

		var label1 = cc.LabelBMFont.create( "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ" , _FONT_ , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
		var label2 = cc.LabelBMFont.create( "abcdefghijklmnopqrstuvwxyzäöü" , _FONT_ , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
		var label3 = cc.LabelBMFont.create( "Aa0123456789&(),!#-%+.?/*" , _FONT_ , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
		var chars = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']; 
		var cnt=0,
			label = [];
		for( ch1 in chars ) {
			var str = "";
			for( ch2 in chars ) {
				str += chars[ch1]+chars[ch2]+" ";
			}
			label[cnt++] = cc.LabelBMFont.create( str , _FONT_ , cc.LabelAutomaticWidth, cc.TEXT_ALIGNMENT_LEFT, cc.p(0, 0) );
		}

        // position the label on the center of the screen
        label1.x = label1.width/2;
        label1.y = size.height-label1.height/2;
        label2.x = label2.width/2;
        label2.y = size.height-label1.height/2-label2.height;
        label3.x = label3.width/2;
        label3.y = size.height-label1.height/2-label2.height-label3.height;
		for( var i=0 ; i<cnt ; i++ ) {
			label[i].x = label[i].width/2;
			label[i].y = label3.y-(label[0].height)*(i+1);	
 	        this.text.addChild(label[i], 5);
		}
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


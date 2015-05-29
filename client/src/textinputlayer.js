
var _b_textInputGetRect = function(node) {
    var rc = cc.rect(node.x, node.y, node.width, node.height);
    rc.x -= rc.width / 2;
    rc.y -= rc.height / 2;
    return rc;
};


var TextInputLayer = cc.Layer.extend({
	_textField: null,
    _beginPos: null,
	_charLimit: 10,
	_finalCallback: null,

    ctor:function (size, cb) {
        this._super();

        this._touchListener = cc.EventListener.create({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan: function(touches, event) {},
			onTouchesMoved: function(touches, event) {},
			onTouchesEnded: function(touches, event) {

				cc.log("OnTouchesEnded: Entering ...");
				var target = event.getCurrentTarget();
				if (!target._textField)
					return;

				// grab first touch
				if(touches.length == 0)
					return;

				var touch = touches[0];
				var point = touch.getLocation();

				var rect = _b_textInputGetRect(target._textField);

				target.onClickTrackNode(cc.rectContainsPoint(rect, point));
			}
		});

		cc.eventManager.addListener(this._touchListener, this);

		if( size ) this._charLimit = size;
		if( cb ) this._finalCallback = cb;
	    cc.spriteFrameCache.addSpriteFrames(res.textinput_plist);

		cc.log("TextInputLayer: ctor finished.");
    },

    onEnter: function() {
        this._super();

        var textBackground = cc.Sprite.create(cc.spriteFrameCache.getSpriteFrame("inputfield.png"),cc.rect(0,0,694,227));
		textBackground.setPosition(cc.p(cc.width/2, 512));
		this.addChild(textBackground);

        // add CCTextFieldTTF
        var textField = this._textField = new cc.TextFieldTTF(_b_t.textinput.insert_text,_b_getFontName(res.indieflower_ttf), 100);
        this.addChild(textField,1);
		_b_retain(textField, "Text field of text input layer");
		textField.setPosition(cc.p(600, 455));
		textField.setTextColor(cc.color(64,0,0));
		textField.setDelegate(this);

		cc.log("onEnter: TextField created with "+_b_t.textinput.insert_text+".");

        this._textFieldAction = cc.sequence(
            cc.fadeOut(0.25),
            cc.fadeIn(0.25)
        ).repeatForever();
        this._action = false;

		textField.attachWithIME();

		cc.audioEngine.setMusicVolume(0.5);
		cc.audioEngine.playMusic(res.texttyping_mp3,true);

		cc.log("TextInputLayer: onEnter finished.");
    },

	onExit: function() {
		this._super();

		this._textField.removeDelegate();
		this.removeAllChildren();
		_b_release(this._textField);
		cc.eventManager.removeListeners(this);
		cc.log("TextInputLayer: onExit finished.");
	},

    onClickTrackNode: function(clicked) {
        var textField = this._textField;
        if (clicked) {
            // TextFieldTTFTest be clicked
            cc.log("TextFieldTTFDefaultTest:CCTextFieldTTF attachWithIME");
			//if( !textField._delegateWithIme ) textField.attachWithIME();
        } else {
            // TextFieldTTFTest not be clicked
            cc.log("TextFieldTTFDefaultTest:CCTextFieldTTF detachWithIME");
			textField.setString("");
            textField.detachWithIME();
        }
    },

    keyboardWillShow: function(info) {
        cc.log("TextInputTest:keyboardWillShowAt(origin:" + info.end.x + "," + info.end.y
            + ", size:" + info.end.width + "," + info.end.height + ")");

        if (!this._textField)
            return;

        var rectTracked = _b_textInputGetRect(this._textField);
        cc.log("TextInputTest:trackingNodeAt(origin:" + info.end.x + "," + info.end.y
            + ", size:" + info.end.width + "," + info.end.height + ")");

        // if the keyboard area doesn't intersect with the tracking node area, nothing need to do.
        if (!cc.rectIntersectsRect(rectTracked, info.end))
            return;

        // assume keyboard at the bottom of screen, calculate the vertical adjustment.
        var adjustVert = cc.rectGetMaxY(info.end) - cc.rectGetMinY(rectTracked);
        cc.log("TextInputTest:needAdjustVerticalPosition(" + adjustVert + ")");

        // move all the children node of KeyboardNotificationLayer
        var children = this.children;
        for (var i = 0; i < children.length; ++i) {
            var node = children[i];
            node.y += adjustVert;
        }
    },

    onTouchesEnded:function (touches, event) {
        cc.log("OnTouchesEnded: Entering ...");
        var target = event.getCurrentTarget();
        if (!target._textField)
            return;

        // grab first touch
        if(touches.length == 0)
            return;

        var touch = touches[0];
        var point = touch.getLocation();

        // decide the trackNode is clicked.
        cc.log("OnTouchesEnded:clickedAt(" + point.x + "," + point.y + ")");

        var rect = _b_textInputGetRect(target._textField);
        cc.log("onTouchesEnded:TrackNode at(origin:" + rect.x + "," + rect.y
            + ", size:" + rect.width + "," + rect.height + ")");

        target.onClickTrackNode(cc.rectContainsPoint(rect, point));
        cc.log("----------------------------------");
    },

    onMouseUp:function (event) {
        var target = event.getCurrentTarget();
        if (!target._textField)
            return;

        var point = event.getLocation();

        // decide the trackNode is clicked.
        cc.log("onMouseUp:clickedAt(" + point.x + "," + point.y + ")");

        var rect = _b_textInputGetRect(target._textField);
        cc.log("onMouseUp:TrackNode at(origin:" + rect.x + "," + rect.y
            + ", size:" + rect.width + "," + rect.height + ")");

        target.onClickTrackNode(cc.rectContainsPoint(rect, point));
        cc.log("----------------------------------");
    },


    onTextFieldAttachWithIME:function (sender) {
		cc.log("onTextFieldAttachWithIME, in!");
        if (!this._action) {
            this._textField.runAction(this._textFieldAction);
            this._action = true;
        }
        return false;
	},


    onTextFieldDetachWithIME:function (sender) {
		cc.log("onTextFieldDetachWithIME, out!");
		// this function is called also after attach ... test by clicking into text field ...
        if (this._action) {
            this._textField.stopAction(this._textFieldAction);
            this._textField.opacity = 255;
            this._action = false;
        }
		if( typeof this._finalCallback === "function" ) this._finalCallback(this._textField.getString());

		return false;
	},


	didAttachWithIME: function() {
		cc.log("didAttachWithIME!!");
	},

	didDetachWithIME: function() {
		cc.log("didDetachWithIME!!");
	},


    onTextFieldInsertText: function(sender, text, len) {
		cc.log("onTextFieldInsertText: in!");
        // if insert enter, treat as default to detach with ime
        if('\n' == text) {
            return false;
        }

        // if the textfield's char count more than m_nCharLimit, doesn't insert text anymore.
        if(sender.getCharCount() >= this._charLimit) {
            return true;
        }

        // create a insert text sprite and do some action
        var label = new cc.LabelTTF(text,_b_t.textinput.insert_text,_b_getFontName(res.indieflower_ttf), 60 );
        this.addChild(label);
        var color = cc.color(64, 0, 0);
        label.color = color;

        // move the sprite from top to position
        var endX = sender.x, endY = sender.y;
        if (sender.getCharCount()) {
            endX += sender.width / 2;
        }

        var duration = 0.5;
        label.x = endX;
        label.y = cc.height - label.height * 2;
        label.scale = 8;

        var seq = cc.sequence(
            cc.spawn(
                cc.moveTo(duration, cc.p(endX, endY)),
                cc.scaleTo(duration, 1),
                cc.fadeOut(duration)),
            cc.callFunc(this.callbackRemoveNodeWhenDidAction, this));
        label.runAction(seq);
        return false;
	},

    
	onTextFieldDeleteBackward:function (sender, delText, len) {
        // create a delete text sprite and do some action
        var label = new cc.LabelTTF(delText, _b_t.textinput.click_here,_b_getFontName(res.indieflower_ttf), 60);
        this.addChild(label);

        // move the sprite to fly out
        var beginX = sender.x, beginY = sender.y;
        beginX += (sender.width - label.width) / 2.0;

        var winSize = cc.director.getWinSize();
        var endPos = cc.p(-winSize.width / 4.0, winSize.height * (0.5 + Math.random() / 2.0));

        var duration = 1;
        var rotateDuration = 0.2;
        var repeatTime = 5;
        label.x = beginX;
        label.y = beginY;

        var seq = cc.sequence(
            cc.spawn(
                cc.moveTo(duration, endPos),
                cc.rotateBy(rotateDuration, (Math.random() % 2) ? 360 : -360).repeat(repeatTime),
                cc.fadeOut(duration)),
            cc.callFunc(this.callbackRemoveNodeWhenDidAction, this));
        label.runAction(seq);
        return false;
	},
});


// Resources for WordBattle

(function() {

	var game = "wordbattle";

	gameVar[game] = [
		"Das Eselein"
	];

	var path = "games/"+game+"/";

	gameRes[game] = {
		HelloWorld_png : path+"res/HelloWorld.png",
		CloseNormal_png : path+"res/CloseNormal.png",
		CloseSelected_png : path+"res/CloseSelected.png"
	};
	
	for( var i=0 ; i<gameVar[game].length ; i++ ) {
		gameRes[game][gameVar[game][i]+"_json"] = path+"variations/"+gameVar[game][i]+"/"+gameVar[game][i]+".json";
	}
})();
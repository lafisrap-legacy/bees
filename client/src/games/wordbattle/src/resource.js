// Resources for WordBattle

(function() {

	var game = "wordbattle",
		path = "src/games/"+game+"/";

	// game specific resources
	gameRes[game] = {
		"All": {
			HelloWorld_png : path+"res/HelloWorld.png",
		},
		"Das Eselein" : {
			CloseNormal_png : path+"res/CloseNormal.png",
			CloseSelected_png : path+"res/CloseSelected.png"
		}
	};

	// fill in mandatory resources
	for( var v in gameRes[game] ) {
		if( v != "All" ) gameRes[game][v]["fairytale_json"] = path+"vars/"+v+"/"+v+".json";
	}
})();
// Resources for WordBattle
// To adapt this resource file to another game you have to
// (1) change the game name
// (2) add 

(function() {

	var game = "wordbattle", // (1)
		path = "src/games/"+game+"/";

	// game specific resources
	gameRes[game] = {
		"All": {
			HelloWorld_png : path+"res/HelloWorld.png",
		},
		"Das Eselein" : {
			Fairytale_json: 	path+"vars/Das Eselein/Das Eselein.json",
			CloseNormal_png: 	path+"res/CloseNormal.png",
			CloseSelected_png: 	path+"res/CloseSelected.png"
		}
	};
})();
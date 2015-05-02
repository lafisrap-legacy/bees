// Resources for WordBattle
// To adapt this resource file to another game you have to
// (1) change the game name
// (2) add ...

(function() {

	var game = "wordbattle", // (1)
		path = "src/games/"+game+"/";

	// game specific resources
	gameRes[game] = {
		"All": {
			wordbattle_png : path+"res/wordbattle.png",
			wordbattle_plist : path+"res/wordbattle.plist",

			bomb_in_water_mp3 : path+"res/sounds/wasserbombe2,0.mp3",
			bomb_on_ship_mp3 : path+"res/sounds/schiffbombe1,0.mp3",
			bomb_flying_mp3: path+"res/sounds/kanonenpfeifen1,0.mp3"
		},
		"Das Eselein" : {
			Fairytale_json: 	path+"vars/Das Eselein/Das Eselein.json",
		}
	};
})();

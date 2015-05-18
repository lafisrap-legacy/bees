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

			startscreen_mp3 : path+"res/sounds/suedsee04.mp3",
			organizing_intro_mp3: path+"res/sounds/schiffe_intro01,03.mp3",
			organizing_loop1_mp3: path+"res/sounds/schiffe_loop02,03.mp3",
			organizing_loop2_mp3: path+"res/sounds/schiffe_loop03,03.mp3",
			organizing_loop3_mp3: path+"res/sounds/schiffe_loop04,03.mp3",
			bomb_in_water_mp3 : path+"res/sounds/wasserbombe2,0.mp3",
			bomb_on_ship_mp3 : path+"res/sounds/schiffbombe1,0.mp3",
			bomb_flying_mp3: path+"res/sounds/kanonenpfeifen1,0.mp3",
			textright_mp3 : path+"res/sounds/wort_richtig_intro01,01.mp3",
			textwrong_mp3 : path+"res/sounds/wort_falsch_intro01,01.mp3"
		},
		"Das Eselein" : {
			Fairytale_json: 	path+"vars/Das Eselein/Das Eselein.json",
		}
	};
})();

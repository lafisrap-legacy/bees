var res = {
	// title
    beehive_jpg : "res/title/beehive.jpg",
    
    // menu
	menu_png : "res/menu/menu.png",
    menu_plist : "res/menu/menu.plist",
	amtype36_png : "res/fonts/amtype36.png",
	amtype36_fnt : "res/fonts/amtype36.fnt",
	bees50_png : "res/fonts/bees50.png",
	bees50_fnt : "res/fonts/bees50.fnt",
	bees25_png : "res/fonts/bees25.png",
	bees25_fnt : "res/fonts/bees25.fnt",
	hourglass140_png : "res/fonts/hourglass140.png",
	hourglass140_fnt : "res/fonts/hourglass140.fnt",
	PTMono100Bees_png : "res/fonts/PTMono100Bees.png",
	PTMono100Bees_fnt : "res/fonts/PTMono100Bees.fnt",
	PTMono700Bees_png : "res/fonts/PTMono280Bees.png",
	PTMono700Bees_fnt : "res/fonts/PTMono280Bees.fnt",
	indieflower_ttf: {type:"font", name:"IndieFlower", srcs:["res/fonts/IndieFlower.ttf"]},

	// list view
	listview_png : "res/listview/listview.png",
    listview_plist : "res/listview/listview.plist",

	// fairies
	fairies_png : "res/fairies/fairies.png",
    fairies_plist : "res/fairies/fairies.plist",

	// textinput view
	textinput_png : "res/textinput/textinput.png",
    textinput_plist : "res/textinput/textinput.plist",
	texttyping_mp3 : "res/sounds/wort_schreiben_loop00,05.mp3",

	// global
	names_json : "res/global/names.json"
};

var gameRes = {};

var g_resources = [];
for (var r in res) {
    g_resources.push(res[r]);
}

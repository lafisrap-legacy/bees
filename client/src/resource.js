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
	indieflower_ttf: {type:"font", name:"IndieFlower", srcs:["res/fonts/IndieFlower.ttf"]},

	// list view
	listview_png : "res/listview/listview.png",
    listview_plist : "res/listview/listview.plist",

	// fairies
	fairies_png : "res/fairies/fairies.png",
    fairies_plist : "res/fairies/fairies.plist",

	// global
	names_json : "res/global/names.json"
};

var gameRes = {};

var g_resources = [];
for (var r in res) {
    g_resources.push(res[r]);
}

var res = {
	// title
    beehive_jpg : "res/title/beehive.jpg",
    
    // menu
	menu_png : "res/menu/menu.png",
    menu_plist : "res/menu/menu.plist",
	amtype36_png : "res/fonts/amtype36.png",
	amtype36_fnt : "res/fonts/amtype36.fnt",

	// list view
	listview_png : "res/listview/listview.png",
    listview_plist : "res/listview/listview.plist",

	// global
	names_json : "res/global/names.json"
};

var gameRes = {};

var g_resources = [];
for (var r in res) {
    g_resources.push(res[r]);
}

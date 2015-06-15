package main

import (
	"github.com/codegangsta/cli"
	"os"
)

/*
type frame struct {
	frame string
	offset string
	rotated bool
	sourceColorRect string
	sourceSize string
}

type Plist struct {
	Frames map[string]frame
	Metadata map[string]string
}
*/

type Plist map[string]interface{}

func main() {
	app := cli.NewApp()
	app.Name = "beest"
	app.Usage = "configure and monitor a beeserver"
	app.Author = "Michael Schmidt"
	app.Email = "michael@c2064.org"
	app.Version = "0.0.1"

	// setting flags
	app.Flags = []cli.Flag{
		cli.StringFlag{
			Name:  "lang",
			Value: "english",
			Usage: "language for the greeting",
		},
	}

	// app logic
	app.Commands = []cli.Command{
		{
			Name:      "createfont",
			ShortName: "cf",
			Usage:     "convert cocos2d plist to bitmap font",
			Action:    createFont,
			Flags: []cli.Flag{
				cli.StringFlag{
					Name:  "plist",
					Value: "",
					Usage: "cocos2d plist file (input)",
				},
				cli.StringFlag{
					Name:  "json",
					Value: "",
					Usage: "json file (input)",
				},
				cli.StringFlag{
					Name:  "fnt",
					Value: "",
					Usage: "font file (output)",
				},
				cli.StringFlag{
					Name:  "template",
					Value: "",
					Usage: "json template file for resizing",
				},
			},
		},{
			Name:      "mp3length",
			ShortName: "ml",
			Usage:     "Create llist with mp3-file durations",
			Action:    mp3Length,
			Flags: []cli.Flag{
				cli.StringFlag{
					Name:  "path",
					Value: "",
					Usage: "specify directory (default is *.mp3 in current directory)",
				},
			},
		},{
			Name:      "template",
			ShortName: "r",
			Usage:     "just to have an example in the code",
			Subcommands: []cli.Command{
				{
					Name:  "add",
					Usage: "add a new template",
					Action: func(c *cli.Context) {
						println("new task template: ", c.Args().First())
					},
				},
				{
					Name:  "remove",
					Usage: "remove an existing template",
					Action: func(c *cli.Context) {
						println("removed task template: ", c.Args().First())
					},
				},
			},
		}}
	app.Run(os.Args)
}

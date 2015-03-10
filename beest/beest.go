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
			ShortName: "f",
			Usage:     "convert cocos2d plist to bitmap font",
			Action:    createFont,
			Flags: []cli.Flag{
				cli.StringFlag{
					Name:  "plist",
					Value: "",
					Usage: "cocos2d plist file",
				},
				cli.StringFlag{
					Name:  "fnt",
					Value: "",
					Usage: "font file",
				},
			},
		},
		{
			Name:      "complete",
			ShortName: "c",
			Usage:     "complete a task on the list",
			Action: func(c *cli.Context) {
				println("completed task: ", c.Args().First())
			},
		},
		{
			Name:      "template",
			ShortName: "r",
			Usage:     "options for task templates",
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

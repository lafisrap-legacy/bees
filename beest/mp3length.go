package main

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"github.com/codegangsta/cli"
	_ "strconv"
	_ "strings"
)

func mp3Length(c *cli.Context) {

	// get input file name
	path := c.String("path")
	if path == "" {
		path = "./"
	}

	dir, err := os.Open( path )
    if err != nil {
		fmt.Println("Couldn't open directory ", path, "(", err.Error(), ")")
		return
	}

	names, err := dir.Readdirnames(0)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	
	re1 := regexp.MustCompile("Length[^0-9]+([0-9.]+)")
	re2 := regexp.MustCompile("[.,]")
	for i:=0 ; i<len(names) ; i++ {
		out, err := exec.Command("sox", path + names[i], "-n" , "stat" ).CombinedOutput();
		if err != nil {
			fmt.Println("Error while executing command with", path + names[i] , "(", err.Error(), ")")
			return	
		}

		fmt.Printf("\"%s\": %s,\n", re2.ReplaceAllString(names[i], "_") ,  re1.FindStringSubmatch(string(out))[1] );
	}
}

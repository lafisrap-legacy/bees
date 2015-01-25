package main

// Bees Server main file
//

import (
	_ "encoding/json"
	_ "fmt"
	_ "io"
    "log"
	_ "os"
	"github.com/jimlawless/cfg"
)

const (
)

func LoadConfig() map[string]string {
	m := make(map[string]string)
	err := cfg.Load("bees.cfg", m)
	if err != nil {
		log.Fatal(err)
	}

	return m
}

func main() {
	config := LoadConfig()
	if config == nil {
        panic(config)
	}

    requestChan, doneChan := StartDatabase(config)
    commandChan := StartController(config, requestChan)
    StartConnector(config, commandChan)

    doneChan <- true
}

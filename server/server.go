package main

// Bees Server main file
//

import (
	_ "encoding/json"
	"fmt"
    "time"
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

    fmt.Printf("main %v %v\n", requestChan, doneChan)

    a1 := make(chan []Db_data)
    a2 := make(chan []Db_data)
    requestChan <- Db_request{
        request: "getBeehives",
        dataChan: a1,
    }
    requestChan <- Db_request{
        request: "loginBeehive",
        dataChan: a2,
        parameter: map[string]string{
            "beehive": "yaylaswiese",
            "secret" : "tat",
        },
    }

    for {
        select {
        case d1 := <-a1:
            fmt.Printf("A1: received data: %v\n", d1)
        case d2 := <-a2:
            fmt.Printf("A2: received data: %v\n", d2)
        }
    }

    ticker := time.NewTicker(2 * time.Second)
    <-ticker.C

    fmt.Printf("Sending true to the doneChannel\n")
    doneChan <- true

    <-ticker.C
}

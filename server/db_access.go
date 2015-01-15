package main

// Database interface for bees server
//
// The database interface consists of the data structures, constants and
// functions to handle all database request. It serves the database channel, 
// that takes request from the websocket connections to the players

import (
    "fmt"
    _ "encoding/json"
    _ "github.com/ziutek/mymysql/mysql"
    _ "github.com/ziutek/mymysql/thrsafe"
    "github.com/jimlawless/cfg"
    _ "io"
    "log"
    _ "os"
)

const (
)


type Db_request struct {
    request string
    beehive [40]byte
    

}

type Db_data struct {
}


func loadConfig() map[string]string {
    m := make(map[string]string)
    err := cfg.Load("bees.cfg", m)
    if err != nil {
        log.Fatal(err)
    }

    return m
}

func main() {
    config := loadConfig()

    fmt.Printf("%v\n", config)
}

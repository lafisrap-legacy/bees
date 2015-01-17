package main

// Database interface for bees server
//
// The database interface consists of the data structures, constants and
// functions to handle all database request. It serves the database channel,
// that takes request from the websocket connections to the players

import (
	_ "encoding/json"
	"fmt"
	"github.com/ziutek/mymysql/mysql"
	_ "github.com/ziutek/mymysql/thrsafe"
	_ "io"
	_ "log"
	_ "os"
)

type Db_request struct {
	request string
    dataChan chan []Db_data
    parameter Db_data
}

type Db_data map[string]string

func StartDatabase(config map[string]string) (chan Db_request, chan bool) {
	database := mysql.New("tcp", "", "127.0.0.1:3306", config["user"], config["pass"], config["database"])
	fmt.Printf("Connect to tcp:127.0.0.1:3306...\n")
	if err := database.Connect(); err != nil {
		panic(err)
	}

	requestChan := make(chan Db_request)
	doneChan := make(chan bool)

	go serveDatabase(database, requestChan, doneChan)

	return requestChan, doneChan
}

func serveDatabase(database mysql.Conn, requestChan chan Db_request , doneChan chan bool) {

	fmt.Printf("serveDatabase: %v\n", database)

	for {
        fmt.Printf("Waiting for select statement ...\n")
		select {
        case req := <-requestChan:
            fmt.Printf("I got a request: %v\n", req)
            go distributeRequest(database, req)
        case <-doneChan:
			fmt.Printf("serveDatabase: Got closing signal. Stop serving.\n")
			return
		}
	}
}

func distributeRequest(database mysql.Conn, req Db_request) {

    switch(req.request) {
        case "getBeehives":         req.dataChan <- getBeehives(database)
        default:                    req.dataChan <- []Db_data{}
    }
}

func getBeehives(database mysql.Conn) []Db_data {

    s := "select name from beehives";

    rows, res, err := database.Query(s)

    if err == nil {
        return collectRows(rows, map[string]int{
            "name":res.Map("name"),
        })
    }

    return []Db_data{}
}

func collectRows(rows []mysql.Row, cols map[string]int) []Db_data {
    data := []Db_data{}

    for _, row := range rows {
        m := Db_data{}
        for name, col := range cols {
            m[name] = row.Str(col)
        }
        data = append(data, m)
    }

    return data
}

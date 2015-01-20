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
    "errors"
)

type Db_request struct {
	request   string
	dataChan  chan []Cmd_data
	parameter Cmd_data
}

func StartDatabase(config map[string]string) (chan Db_request, chan bool) {
	database := mysql.New("tcp", "", "127.0.0.1:3306", config["user"], config["pass"], config["database"])
	if err := database.Connect(); err != nil {
		panic(err)
	}

	requestChan := make(chan Db_request)
	doneChan := make(chan bool)

	go serveDatabase(database, requestChan, doneChan)

	return requestChan, doneChan
}

func serveDatabase(database mysql.Conn, requestChan chan Db_request, doneChan chan bool) {

	for {
		select {
		case req := <-requestChan:
			fmt.Printf("I got a request: %v\n", req)
			go distributeRequest(database, req)
		case <-doneChan:
			return
		}
	}
}

func distributeRequest(database mysql.Conn, req Db_request) {

	switch req.request {
	case "getBeehives":
		req.dataChan <- getBeehives(database)
	case "loginBeehive":
		req.dataChan <- loginBeehive(database, req.parameter)
	default:
		req.dataChan <- []Cmd_data{}
	}
}

func getBeehives(database mysql.Conn) []Cmd_data {

	s := "select name from beehives"

	rows, res, err := database.Query(s)

	if err == nil {
		return collectRows(rows, map[string]int{
			"name": res.Map("name"),
		})
	}

    return []Cmd_data{{"error":err.Error()}}
}

func loginBeehive(db mysql.Conn, p Cmd_data) []Cmd_data {

    beehive, ok1 := p["beehive"];
    secret1, ok2  := p["secret"];
    var err error

    if ok1 && ok2 {

        s := fmt.Sprintf("select id, secret, shortname from beehives where shortname = '%s'", beehive)

        row, res, err := db.QueryFirst(s)
        if err == nil {

            fmt.Printf("1 (%v) (%v)\n", row, res)
            secret2 := row.Str(res.Map("secret"))

            fmt.Printf("2\n")
            if secret1 == secret2 {
                return []Cmd_data{{
                    "id":        row.Str(res.Map("id")),
                    "shortname": row.Str(res.Map("shortname")),
                }}

            } else {
                err = errors.New("Wrong secret.")
            }
        }
    } else {
        err = errors.New("Parameter missing: beehive or secret.")
    }

    return []Cmd_data{{"error":err.Error()}}
}

func collectRows(rows []mysql.Row, cols map[string]int) []Cmd_data {
	data := []Cmd_data{}

	for _, row := range rows {
		m := Cmd_data{}
		for name, col := range cols {
			m[name] = row.Str(col)
		}
		data = append(data, m)
	}

	return data
}

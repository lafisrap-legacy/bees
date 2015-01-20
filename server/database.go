package main

// Database interface for bees server
//
// The database interface consists of the data structures, constants and
// functions to handle all database request. It serves the database channel,
// that takes request from the websocket connections to the players

import (
	"fmt"
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
	// "github.com/ziutek/mymysql/mysql"
	// "github.com/ziutek/mymysql/thrsafe"
	// "io"
	// "log"
	// "os"
    "errors"
)

type Db_request struct {
	request   string
	dataChan  chan []Cmd_data
	parameter Cmd_data
}

func StartDatabase(config map[string]string) (chan Db_request, chan bool) {
    str := config["user"]+":"+config["pass"]+"@tcp(127.0.0.1:3306)/"+config["database"];
    fmt.Printf(str)
    db, err := sql.Open("mysql", str)
    err = db.Ping()
	if err != nil {
		panic(err)
	}

	requestChan := make(chan Db_request)
	doneChan := make(chan bool)

	go serveDatabase(db, requestChan, doneChan)

	return requestChan, doneChan
}

func serveDatabase(db *sql.DB, requestChan chan Db_request, doneChan chan bool) {

	for {
		select {
		case req := <-requestChan:
			fmt.Printf("I got a request: %v\n", req)
			go distributeRequest(db, req)
		case <-doneChan:
			return
		}
	}
}

func distributeRequest(db *sql.DB, req Db_request) {

	switch req.request {
	case "getBeehives":
		req.dataChan <- getBeehives(db)
	case "loginBeehive":
		req.dataChan <- loginBeehive(db, req.parameter)
	default:
		req.dataChan <- []Cmd_data{}
	}
}

func getBeehives(db *sql.DB) []Cmd_data {

	rows, err := db.Query("select name from beehives")
	if err != nil {
        panic(err)
    }
    defer rows.Close()

    data := []Cmd_data{}
    for i := 0 ; rows.Next() ; i++ {
        var name string
        err := rows.Scan(&name)
        if err != nil {
            panic(err)
        }
        data = append(data, Cmd_data{
            "name": name,
        })
	}
    return data;
}

func loginBeehive(db *sql.DB, p Cmd_data) []Cmd_data {

    beehive, ok1 := p["beehive"];
    secret1, ok2  := p["secret"];
    var err error

    if ok1 && ok2 {

        var id, secret2, shortname string
        err = db.QueryRow("select id, secret, shortname from beehives where shortname = ?", beehive).Scan(&id, &secret2, &shortname)
        switch {
        case err == sql.ErrNoRows:
            fmt.Printf("Beehive not found!\n", err)
            err = errors.New("Beehive '"+beehive+"' not found.")
        case err != nil:
            fmt.Printf("Beehive absolutely not found!\n", err)
            panic(err)
        default:
            fmt.Printf("Beehive found!\n", err)
            if secret1 == secret2 {
                return []Cmd_data{{
                    "id":        id,
                    "shortname": shortname,
                }}

            } else {
                err = errors.New("Wrong secret.")
            }
        }
    } else {
        err = errors.New("Parameter missing: beehive or secret.")
    }

    fmt.Printf("1 1 1\n", err)
    return []Cmd_data{{
        "error": err.Error(),
    }}
}


package main

// Database interface for bees server
//
// The database interface consists of the data structures, constants and
// functions to handle all database request. It serves the database channel,
// that takes request from the websocket connections to the players

import (
	_ "fmt"
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
    db, err := sql.Open("mysql", str)
    db.SetMaxOpenConns(50)
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
        panic("getBeehives: "+ err.Error())
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
            err = errors.New("Beehive '"+beehive+"' not found.")
        case err != nil:
            panic("loginBeehive: "+ err.Error())
        default:
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

    return []Cmd_data{{
        "error": err.Error(),
    }}
}


package main

// Database interface for bees server
//
// The database interface consists of the data structures, constants and
// functions to handle all database request. It serves the database channel,
// that takes request from the websocket connections to the players

import (
	"database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"errors"
	"crypto/rand"
	"crypto/sha1"
	"encoding/hex"
)

type Db_request struct {
	request   string
	session	  *Session
	dataChan  chan []Cmd_data
	parameter Cmd_data
}

func StartDatabase(config map[string]string) (chan Db_request, chan bool) {
	str := config["user"] + ":" + config["pass"] + "@tcp(127.0.0.1:3306)/" + config["database"]
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

/*
 * Helper functions
*/
func GetHash(bytes []byte) string {
	var hash [20]byte
	if bytes == nil {

		_, err := rand.Read(hash[:])
		if err != nil {
			panic("getHash: " + err.Error())
		}
	} else {
		hash = sha1.Sum(bytes)
	}
	return hex.EncodeToString(hash[:])
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
	case "signup":
		req.dataChan <- signup(db, req.parameter)
	case "login":
		req.dataChan <- login(db, req.parameter)
	case "signoff":
		req.dataChan <- signoff(db, req.session, req.parameter)
	case "saveState":
		req.dataChan <- saveState(db, req.session, req.parameter)
	case "getBeehives":
		req.dataChan <- getBeehives(db)
	case "loginBeehive":
		req.dataChan <- loginBeehive(db, req.parameter)
	default:
		req.dataChan <- []Cmd_data{}
	}
}

func signup(db *sql.DB, p Cmd_data) []Cmd_data {
	var playerId string

	magicSpell, ok := p["magicSpell"]

	if !ok {
		var id string
		for playerId == "" {
			// create player id
			playerId = GetHash(nil)

			// look if playerId is already in use (very unlikly)
			err := db.QueryRow("select id from players where id = ?", playerId).Scan(&id)
			switch {
			case err == sql.ErrNoRows:
			case err == nil:
				playerId = ""
			default:
				panic("signup: " + err.Error())
			}
		}

		// insert new player id
		_, err := db.Exec("insert into players (id, beehive, magicspell, logins, gamestate) values (?,?,?,?,?)", playerId, "yaylaswiese", "", 0,"")
		if err != nil {
			panic("signup: " + err.Error())
		}
	} else {
		// search for magicSpell in players table, get player id
		fmt.Printf("Magic spell: %s\n",magicSpell)
	}

	return []Cmd_data{{
		"playerId" : playerId,
	}}
}

func signoff(db *sql.DB, session *Session, p Cmd_data) []Cmd_data {

	var err error
	playerId := session.playerId;
	_, err = db.Exec("DELETE FROM players WHERE id = ?", playerId)
	if err != nil {
		panic("signoff: " + err.Error())
	}

	// delete all other player related data here ...

	return []Cmd_data{}
}

func login(db *sql.DB, p Cmd_data) []Cmd_data {

	playerId, ok := p["playerId"]
	var err error
	if ok && playerId != "" {

		// look if playerId is available 
		var id, beehive, magicspell, gamestate string
		var logins int;
		err := db.QueryRow("SELECT id, beehive, magicspell, logins, gamestate FROM players WHERE id = ?", playerId).Scan(&id,&beehive,&magicspell,&logins,&gamestate)
		switch {
		case err == sql.ErrNoRows:
			err = errors.New("Player id not found.")
		case err == nil:
			// increment login counter
			_, err := db.Exec("UPDATE players SET logins = ? WHERE id = ?", logins+1 , playerId)
			if err != nil {
				panic("login: UPDATE" + err.Error())
			}

			return []Cmd_data{{
				"beehive": beehive,
				"magicSpell": magicspell,
				"gameState": gamestate,
			}}
		default:
			panic("login SELECT: " + err.Error())
		}
	} else {
		err = errors.New("PlayerId parameter missing.")
	}

	return []Cmd_data{{
		"error": err.Error(),
	}}
}

func saveState(db *sql.DB, session *Session, p Cmd_data) []Cmd_data {

	var err error
	playerId := session.playerId;
	gameState, ok := p["gameState"] // here I get a map,stringify it?
	if ok {

		_, err = db.Exec("UPDATE players SET gamestate = ? WHERE id = ?", gameState , playerId)
		if err != nil {
			panic("saveState: UPDATE" + err.Error())
		}
		return []Cmd_data{}
	} else {
		err = errors.New("GameState parameter missing.")
	}

	return []Cmd_data{{
		"error": err.Error(),
	}}
}


func getBeehives(db *sql.DB) []Cmd_data {

	rows, err := db.Query("select name from beehives")
	if err != nil {
		panic("getBeehives: " + err.Error())
	}
	defer rows.Close()

	data := []Cmd_data{}
	for i := 0; rows.Next(); i++ {
		var name string
		err := rows.Scan(&name)
		if err != nil {
			panic(err)
		}
		data = append(data, Cmd_data{
			"name": name,
		})
	}
	return data
}

func loginBeehive(db *sql.DB, p Cmd_data) []Cmd_data {

	beehive, ok1 := p["beehive"]
	secret1, ok2 := p["secret"]
	var err error

	if ok1 && ok2 {

		var id, secret2, shortname string
		err = db.QueryRow("select id, secret, shortname from beehives where shortname = ?", beehive).Scan(&id, &secret2, &shortname)
		switch {
		case err == sql.ErrNoRows:
			err = errors.New("Beehive '" + beehive + "' not found.")
		case err != nil:
			panic("loginBeehive: " + err.Error())
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

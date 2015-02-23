// Beeserver is the main communication hub for all bees clients
// It consists of three main compontents: Database, Controller, Connector
// The Database component contains all direct database access functionality 
// and a Request interface. (database.go)
// The Controller contains all game logic, session management und is accessed 
// through a Command interface. (controller.go)
// The Connector handles the websocket connections with the clients and all 
// JSON/GOANG-conversion (connector.go)
package beeserver

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

// Db_request ist the structure of requests send to the database component
// 	request		The name of the request
//	session		The player session
//	dataChan	The back channel for request results
//	parameter	Map with parameters
type Db_request struct {
	request   string
	session	  *Session
	dataChan  chan []Cmd_data
	parameter Cmd_data
}

// StartDatabase initiates the database and create a request channel for the controller
func StartDatabase(config map[string]string, doneChan chan bool) (chan Db_request) {
	str := config["user"] + ":" + config["pass"] + "@tcp(127.0.0.1:3306)/" + config["database"]
	db, err := sql.Open("mysql", str)
	db.SetMaxOpenConns(50)
	err = db.Ping()
	if err != nil {
		panic(err)
	}

	requestChan := make(chan Db_request)

	go serveDatabase(db, requestChan, doneChan)

	return requestChan
}

// GetHash return a 40 Byte hash value. If given a byte array as parameter it returns 
// its SHA1 value.
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

// serveDatabase is the internal event loop for database request
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

// distributeRequests matches the request with the corresponding function calls
func distributeRequest(db *sql.DB, req Db_request) {

	switch req.request {
	case "signup":
		req.dataChan <- Signup(db, req.parameter)
	case "login":
		req.dataChan <- Login(db, req.parameter)
	case "signoff":
		req.dataChan <- Signoff(db, req.session, req.parameter)
	case "saveState":
		req.dataChan <- SaveState(db, req.session, req.parameter)
	case "getBeehives":
		req.dataChan <- GetBeehives(db)
	case "loginBeehive":
		req.dataChan <- LoginBeehive(db, req.parameter)
	default:
		req.dataChan <- []Cmd_data{}
	}
}

// Signup creates a player account, or if given a magic spell reactivates an
// existing account. This is meant for activation one player account on different 
// devices and as a backup facility.
func Signup(db *sql.DB, p Cmd_data) []Cmd_data {
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

// Signoff deletes a plaer account.
func Signoff(db *sql.DB, session *Session, p Cmd_data) []Cmd_data {

	var err error
	playerId := session.playerId;
	_, err = db.Exec("DELETE FROM players WHERE id = ?", playerId)
	if err != nil {
		panic("signoff: " + err.Error())
	}

	// delete all other player related data here ...

	return []Cmd_data{}
}

// Login request retrieves the current game state, beehive and magic spell  of 
// a player. A new session id is added by the controller.
func Login(db *sql.DB, p Cmd_data) []Cmd_data {

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

// SaveState stores a JSON string into the players table, that contains the 
// current game state
func SaveState(db *sql.DB, session *Session, p Cmd_data) []Cmd_data {

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

// GetBeehives returns a list with all currently available beehives
func GetBeehives(db *sql.DB) []Cmd_data {

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

// LoginBeehive moves a player account to a new beehive
func LoginBeehive(db *sql.DB, p Cmd_data) []Cmd_data {

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

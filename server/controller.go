package main

// Bees Controller, all application logic supposed to happen here
//

import (
	"time"
	_ "encoding/json"
	"fmt"
	_ "io"
	_ "log"
	_ "os"
)

const (
	// time till inactiv sessions are cleared
	sessionRefresh time.Duration = 300 * time.Second
)

type Command struct {
	command   string
	sid string
	dataChan  chan []Cmd_data
	parameter Cmd_data
}

type Cmd_data map[string]string

type Session struct {
	playerId string
	beehive string
	timestamp time.Time
}

func StartController(_ map[string]string, requestChan chan Db_request) chan Command {

	commandChan := make(chan Command)

	go handleCommands(commandChan, requestChan)

	return commandChan
}

func handleCommands(commandChan chan Command, requestChan chan Db_request) {
	sessions := make(map[string]Session)
	sessionTicker := time.NewTicker(sessionRefresh)
	for {
		select {
		case cmd := <-commandChan:
			go commandInterpreter(cmd, requestChan, sessions)
		case <- sessionTicker.C:
			go refreshSession(sessions)
		}
	}
}

func commandInterpreter(cmd Command, requestChan chan Db_request, sessions map[string]Session) {

	dataChan := make(chan []Cmd_data)

	var session Session
	var ok bool
	if cmd.sid != "" {
		// look for session 
		if session, ok = sessions[cmd.sid] ; ok {
			session.timestamp = time.Now()
		} else {

			cmd.dataChan <- []Cmd_data{{
				"error" : "Session ID not valid.",
			}}
			return
		}
	} else {
		session = Session{};
	}

	switch cmd.command {
	// database command with no modifications (pass through)
	case "loginBeehive":
		fallthrough
	case "getBeehives":
		fallthrough
	case "signup":
		requestChan <- Db_request{
			request:   cmd.command,
			session:   &session,
			dataChan:  dataChan,
			parameter: cmd.parameter,
		}
		cmd.dataChan <- <-dataChan
	case "login":
		requestChan <- Db_request{
			request:   cmd.command,
			session:   &session,
			dataChan:  dataChan,
			parameter: cmd.parameter,
		}
		data := <-dataChan

		// make new sid, put it into the session table
		sid := GetHash(nil)
		fmt.Printf("Inserting %s into session.\n",sid)
		sessions[sid] = Session{
			playerId : data[0]["playerid"],
			beehive  : data[0]["beehive"],
			timestamp : time.Now(),
		}
		data[0]["sid"] = sid
		cmd.dataChan <- data
	default:
		cmd.dataChan <- []Cmd_data{{
			"error" : "Command not available.",
		}}
	}
}

func refreshSession(sessions map[string]Session) {
	fmt.Printf("Entering refresh... ")
	now := time.Now()
	for sid := range sessions {
		if now.After(sessions[sid].timestamp.Add(sessionRefresh)) {
			delete( sessions, sid )
			fmt.Printf("Deleting %s from session.\n",sid)
		}
	}
}

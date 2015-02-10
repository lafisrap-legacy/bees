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
	// time till inactive sessions are cleared
	sessionExpire time.Duration = 300 * time.Second
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
	sessionTicker := time.NewTicker(sessionExpire)
	for {
		select {
		case cmd := <-commandChan:
			go commandInterpreter(cmd, requestChan, sessions)
		case <- sessionTicker.C:
			go expireSession(sessions)
		}
	}
}

func commandInterpreter(cmd Command, requestChan chan Db_request, sessions map[string]Session) {

	dataChan := make(chan []Cmd_data)

	fmt.Printf("Session manager: Received command: %s.\n",cmd.command)
	var session Session
	var ok bool
	if cmd.sid != "" {
		// look for session 
		if session, ok = sessions[cmd.sid] ; ok {
			fmt.Printf("Session manager: Found session %s.\n",cmd.sid)
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
	// commands with no modifications by controller (pass through to database)
	case "loginBeehive":
		fallthrough
	case "getBeehives":
		fallthrough
	case "saveState":
		fallthrough
	case "signup":
		requestChan <- Db_request{
			request:   cmd.command,
			session:   &session,
			dataChan:  dataChan,
			parameter: cmd.parameter,
		}
		cmd.dataChan <- <-dataChan
	// commands with modifications
	case "login":
		requestChan <- Db_request{
			request:   cmd.command,
			session:   &session,
			dataChan:  dataChan,
			parameter: cmd.parameter,
		}
		data := <-dataChan

		sid := GetHash(nil)
		fmt.Printf("Login: Inserting %s into session.\nPlayerId: %s\n",sid,cmd.parameter["playerId"])
		sessions[sid] = Session{
			playerId : cmd.parameter["playerId"],
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

func expireSession(sessions map[string]Session) {
	fmt.Printf("Entering expire session... ")
	now := time.Now()
	for sid := range sessions {
		if now.After(sessions[sid].timestamp.Add(sessionExpire)) {
			delete( sessions, sid )
			fmt.Printf("Deleting %s from session.\n",sid)
		}
	}
}

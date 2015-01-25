
package main

// Bees Controller, all application logic supposed to happen here
//

import (
	_ "encoding/json"
	_ "fmt"
	_ "io"
    _ "log"
	_ "os"
)

const (
)

type Command struct {
    command     string
    dataChan    chan []Cmd_data
    parameter   Cmd_data
}

type Cmd_data map[string]string

func StartController(_ map[string]string, requestChan chan Db_request) chan Command {

    commandChan := make(chan Command)

    go handleCommands(commandChan, requestChan)

    return commandChan
}

func handleCommands(commandChan chan Command, requestChan chan Db_request) {
    for {
        select {
        case cmd := <-commandChan:
            go commandInterpreter(cmd, requestChan)
        }
    }
}

func commandInterpreter(cmd Command, requestChan chan Db_request) {

    dataChan := make(chan []Cmd_data)

    switch cmd.command {
    // database command with no modifications (pass through)
    case "getBeehives":
        fallthrough
    case "loginBeehive":
        requestChan <- Db_request{
            request: cmd.command,
            dataChan: dataChan,
            parameter: cmd.parameter,
        }
        cmd.dataChan <- <-dataChan
    default:
        cmd.dataChan <- []Cmd_data{}
    }
}


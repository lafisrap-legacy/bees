package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)


type socket struct {
	io.ReadWriter
	done chan bool
}

func (s socket) Close() error {
	s.done <- true
	return nil
}

var dbChan = make(chan string)

func StartConnector(config map[string]string, commandChan chan Command) {

    http.Handle(config["wsdir"], websocket.Handler(func(ws *websocket.Conn) {
        fmt.Printf("Started new Socket handler ...")
        s := socket{ws, make(chan bool)}
        go translateMessages(s, commandChan)
        <-s.done
    }))

    fmt.Printf("Started Socket handler ...")

    err := http.ListenAndServe(config["wsaddress"]+":"+config["wsport"], nil)
    if err != nil {
        log.Fatal(err)
        fmt.Println(err)
    }
}


func translateMessages(s socket, commandChan chan Command) {
    decoder := json.NewDecoder(s)
    encoder := json.NewEncoder(s)
    for {
        var message Cmd_data
        err := decoder.Decode(&message)
        if err != nil {
            fmt.Println(err)
            s.done <- true
            return
        }
        dataChan := make(chan []Cmd_data)
        if command, ok := message["command"]; ok {
            sid := message["sid"]
            delete(message,"sid")
            delete(message,"command")
            commandChan <- Command{
                command: command,
                dataChan: dataChan,
                parameter: message,
            }

            go catchReturn(dataChan, encoder, sid)
        }
    }
}

func catchReturn(dataChan chan []Cmd_data, encoder *json.Encoder, sid string) {
    select {
    case data := <-dataChan:
        cdata := map[string]interface{}{
            "sid": sid,
            "data": data,
        }
        encoder.Encode(&cdata)
    }
}


package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"fmt"
	"io"
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
		fmt.Printf("Started new socket handler on %s ...\n",config["wsaddress"]+":"+config["wsport"])
		s := socket{ws, make(chan bool)}
		go translateMessages(s, commandChan)
		<-s.done
	}))

	err := http.ListenAndServe(config["wsaddress"]+":"+config["wsport"], nil)
	if err != nil {
		panic(err.Error())
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
			var sid string
			if sid, ok = message["sid"]; !ok {
				sid = ""
			} else {
				delete(message, "sid")
			}
			delete(message, "command")
			commandChan <- Command{
				command:   command,
				sid:	   sid,
				dataChan:  dataChan,
				parameter: message,
			}

			if sid == "" {
				sid = command
			}

			go catchReturn(dataChan, encoder, command)
		}
	}
}

func catchReturn(dataChan chan []Cmd_data, encoder *json.Encoder, command string) {
	select {
	case data := <-dataChan:
		cdata := map[string]interface{}{
			"command":  command,
			"data": data,
		}
		encoder.Encode(&cdata)
	}
}

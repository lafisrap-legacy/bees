package beeserver

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
)

// socket represents a socket connection
//
// io.ReadWriter is the standard read/write interface
// done is a channel to stop the socket
//
type socket struct {
	io.ReadWriter
	done chan bool
}

// Close cdds a Close method to the socket making it a ReadWriteCloser
//
func (s socket) Close() error {
	s.done <- true
	return nil
}

// notification represents a notification sent to a client
// 
// command is the client command, e.g. "message" or "gameUpdate"
// data is one or more JSON strings, with semantics only known to the clients
//
type notification struct {
	command string
	data []Cmd_data
}

var dbChan = make(chan string)

// StartConnector starts up the websocket connector of the bee server
// 	config		settings from config file
// 	commandChan	channel to send commands to the controller
// 	doneChan	channel to signal end or get it signaled
func StartConnector(config map[string]string, commandChan chan Command, doneChan chan bool) {

	http.Handle(config["wsdir"], websocket.Handler(func(ws *websocket.Conn) {
		fmt.Println("New socket connection started ...")
		s := socket{ws, make(chan bool)}
		go translateMessages(s, commandChan)
		<-s.done
		fmt.Println("Socket connection gone ...")
	}))

	fmt.Println("Bees connector started on %s. Listening ...", config["wsaddress"]+":"+config["wsport"])

	err := http.ListenAndServe(config["wsaddress"]+":"+config["wsport"], nil)
	if err != nil {
		fmt.Println("Error: " + err.Error())
		doneChan <- true
	}
}

func translateMessages(s socket, commandChan chan Command) {
	decoder := json.NewDecoder(s)
	encoder := json.NewEncoder(s)

	var sid string
	var err error
	var ok bool

	for {
		var message Cmd_data
		var command string
		err = decoder.Decode(&message)
		if err != nil {
			fmt.Println("Connection error: ", err.Error())
			logout(&sid)
			s.done <- true
			return
		}
		dataChan := make(chan []Cmd_data)
		if command, ok = message["command"]; ok {
			var msgSid string
			if msgSid, ok = message["sid"]; !ok {
				if command != "login" && command != "signup" {
					err = errors.New("No session id (sid) provided.")
				}
			} else {
				delete(message, "sid")
				if sid == "" || sid != msgSid {
					fmt.Println("No sid: ",sid,"!=",msgSid,message)
					err = errors.New("No session or session id wrong.("+msgSid+")")
				}
			}
			delete(message, "command")

			if command == "login" && sid != "" {
				err = errors.New("Session already active. Logout first.")
			}

			fmt.Println("Received command",command,"with",message,"err:",err)
			if err == nil {
				commandChan <- Command{
					command:   command,
					sid:       sid,
					dataChan:  dataChan,
					parameter: message,
				}

				fmt.Println("Sent it! Now waiting for reply");
				newSid := catchReturn(dataChan, encoder, command)
				if newSid != "" {
					sid = newSid
				}
			}
		} else {
			err = errors.New("No command.")
		}

		if err != nil {
			cdata := map[string]interface{}{
				"command": command,
				"data": []Cmd_data{{
					"error": err.Error(),
				}},
			}
			encoder.Encode(&cdata)
		}
	}
}

func catchReturn(dataChan chan []Cmd_data, encoder *json.Encoder, command string) string {
	select {
	case data := <-dataChan:
		cdata := map[string]interface{}{
			"command": command,
			"data":    data,
		}
		fmt.Println("Got message back!",cdata)
		encoder.Encode(&cdata)

		if command == "login" {
			if sid, ok := data[0]["sid"]; ok {

				notificationChan := make(chan notification)
				go catchNotifications(notificationChan, encoder)
				setNotificationChan(notificationChan, sid)

				return sid
			}
		}
	}

	return ""
}

func catchNotifications(notificationChan chan notification, encoder *json.Encoder) {
	for {
		select {
		case note := <-notificationChan:
			cdata := map[string]interface{}{
				"command": note.command,
				"data":    note.data,
			}
			encoder.Encode(&cdata)
		}
	}
}

package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"fmt"
    "time"
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

const listenAddr = "192.168.178.41:4000"

var partner = make(chan io.ReadWriteCloser)

var dbChan = make(chan string)

func StartConnector(config map[string]string, commandChan chan Command) {

    http.Handle("/socket", websocket.Handler(func(ws *websocket.Conn) {
        s := socket{ws, make(chan bool)}
        go translateMessages(s, commandChan)
        <-s.done
    }))

    fmt.Printf("Started Socket handler ...")

    err := http.ListenAndServe(listenAddr, nil)
    if err != nil {
        log.Fatal(err)
        fmt.Println(err)
    }

    a1 := make(chan []Cmd_data)
    a2 := make(chan []Cmd_data)
    commandChan <- Command{
        command: "getBeehives",
        dataChan: a1,
    }
    commandChan <- Command{
        command: "loginBeehive",
        dataChan: a2,
        parameter: map[string]string{
            "beehive": "yaylaswiese",
            "secret" : "tat",
        },
    }

    ticker := time.NewTicker(2 * time.Second)
    for {
        select {
        case d1 := <-a1:
            fmt.Printf("A1: received data: %v\n", d1)
        case d2 := <-a2:
            fmt.Printf("A2: received data: %v\n", d2)
        case <-ticker.C:
            break
        }
    }
}

/*
func socketHandler(ws *websocket.Conn) {
	s := socket{ws, make(chan bool)}
	go translateMessages(s)
	<-s.done
}
*/

func translateMessages(s socket, commandChan chan Command) {
    decoder := json.NewDecoder(s)
    encoder := json.NewEncoder(s)
    for {
        fmt.Printf("Waiting for a message ... \n")
        var message Cmd_data
        err := decoder.Decode(&message)
        if err != nil {
            fmt.Println(err)
            s.done <- true
            return
        }
        fmt.Printf("Message received and decoded: %v. \n",message)
        dataChan := make(chan []Cmd_data)
        if command, ok := message["command"]; ok {
            delete(message,"command")
            commandChan <- Command{
                command: command,
                dataChan: dataChan,
                parameter: message,
            }
            fmt.Printf("Sending command %s. \n",command)
        }
        go catchReturn(dataChan, encoder)
    }
}

func catchReturn(dataChan chan []Cmd_data, encoder *json.Encoder) {
    select {
    case data := <-dataChan:
        encoder.Encode(&data)
    }
}

/*
func serveDB(db mysql.Conn) {

	p, err := json.Marshal(person)
	if err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println("Sending: " + string(p))

	for {
		dbChan <- string(p)
	}
}


func sendNames(c io.ReadWriteCloser) {
	fmt.Println("Waiting for names ...")
	m := <-dbChan
	fmt.Println("Received: " + m)
	fmt.Fprint(c, m)
	fmt.Println("Names sended!")
}

func receiveAnswer(r io.Reader) {
    //var Stdout = os.NewFile(uintptr(syscall.Stdout), "/dev/stdout")
	fmt.Println("Listening to what comes back ...")
	//io.Copy(Stdout,r)
    fmt.Println(r)
}

func match(c io.ReadWriteCloser) {
	fmt.Fprint(c, "Waiting for a partner ...")

	select {
	case partner <- c:
		//
	case p := <-partner:
		chat(p, c)
	}
	fmt.Println("Stopped waiting for a partner.")
}

func chat(a, b io.ReadWriteCloser) {
	fmt.Fprintln(a, "Found one! Say Hi!")
	fmt.Fprintln(b, "Found one! Say Hi!")
	errc := make(chan error, 1)
	go cp(a, b, errc)
	go cp(b, a, errc)
	if err := <-errc; err != nil {
		log.Println(err)
	}

	a.Close()
	b.Close()
}

func cp(w io.Writer, r io.Reader, errc chan<- error) {
	_, err := io.Copy(w, r)
	errc <- err
}i */

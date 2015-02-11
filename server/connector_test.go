package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"fmt"
	"testing"
)

const (
	testloops int = 500
	gameState string = "{\\\"currentGame\\\":\\\"Stories6\\\"}"
)

type result struct {
	sid  int
	data []map[string]string
}

func TestConnector(t *testing.T) {

	config := LoadConfig()
	if config == nil {
		panic(config)
	}

	requestChan, _ := StartDatabase(config)
	StartController(config, requestChan)

	doneChan := make(chan bool)
	countChan := make(chan bool)
	go count(countChan, doneChan);

	for i:=0 ; i<testloops ; i++ {
		go func(i int) {
			origin := "http://localhost/"
			url := "ws://" + config["wsaddress"] + ":" + config["wsport"] + config["wsdir"]
			ws, err := websocket.Dial(url, "", origin)
			if err != nil {
				t.Errorf("Could reach websocket in loop %d\n",i)
			}

			// signup ...
			decoder := json.NewDecoder(ws)
			var data map[string]interface{}
			if _, err := ws.Write([]byte("{\"command\":\"signup\"}")); err != nil {
				t.Errorf("Couldn't send Signup request in loop %d.",i)
				panic(err)
			}

			// get playerId
			err = decoder.Decode(&data)
			if err != nil {
				t.Errorf("Couldn't get Signup result in loop %d.",i)
			}
			playerId := data["data"].([]interface{})[0].(map[string]interface{})["playerId"].(string)

			// ... and login
			if _, err := ws.Write([]byte(fmt.Sprintf("{\"command\":\"login\",\"playerId\":\"%s\"}",playerId))); err != nil {
				t.Errorf("Couldn't send Login request in loop %d.",i)
			}

			// get sessionId
			err = decoder.Decode(&data)
			if err != nil {
				t.Errorf("Couldn't get Login result in loop %d.",i)
			}
			sid := data["data"].([]interface{})[0].(map[string]interface{})["sid"].(string)

			requests := []string{
				"{\"command\":\"getBeehives\",\"sid\":\""+sid+"\"}",
				"{\"command\":\"loginBeehive\",\"beehive\":\"yaylaswiese\",\"secret\":\"tat\",\"sid\":\""+sid+"\"}",
				"{\"command\":\"saveState\",\"gameState\":\""+gameState+"\",\"sid\":\""+sid+"\"}",
				"{\"command\":\"logout\",\"sid\":\""+sid+"\"}",
			}

			expectedResults := map[string][]map[string]string{
				"getBeehives": {{
					"name": "Bienenstock Turinerstr. 21",
				}, {
					"name": "Yayla's Wiese Bienenstock",
				}},
				"loginBeehive": {{
					"shortname": "yaylaswiese",
				}},
				"saveState": {{
				}},
				"logout": {{
				}},
			}

			for j := 0; j < len(requests); j++ {

				if _, err := ws.Write([]byte(requests[j])); err != nil {
					panic(err)
				}
			}

			receiveResults(t, ws, expectedResults)

/*			// ... and login again
			if _, err := ws.Write([]byte(fmt.Sprintf("{\"command\":\"login\",\"playerId\":\"%s\"}",playerId))); err != nil {
				t.Errorf("Couldn't send Login request in loop %d.",i)
			}

			// get sessionId
			err = decoder.Decode(&data)
			if err != nil {
				t.Errorf("Couldn't get Login result in loop %d.",i)
			}
			fmt.Printf("SECOND LOGIN: %v\n",data)
			sid = data["data"].([]interface{})[0].(map[string]interface{})["sid"].(string)
			gs := data["data"].([]interface{})[0].(map[string]interface{})["gameState"].(string)
			if gs != gameState {
				t.Errorf("Login: gameState is not correct in loop %d.",i)
			}

			// ... and sign off
			if _, err := ws.Write([]byte(fmt.Sprintf("{\"command\":\"signoff\",\"sid\":\"%s\"}",sid))); err != nil {
				t.Errorf("Couldn't send Signoff request in loop %d.",i)
			}

			// get sessionId
			err = decoder.Decode(&data)
			if err != nil {
				t.Errorf("Couldn't get Signoff result in loop %d.",i)
			}
*/			countChan <- true
		}(i)
	}

	<-doneChan
}

func count(countChan chan bool, doneChan chan bool) {
	for i:=0 ; i<testloops ; i++ {
		<-countChan
	}
	doneChan <- true
}

func receiveResults(t *testing.T, ws *websocket.Conn, expectedResults map[string][]map[string]string) {

	decoder := json.NewDecoder(ws)

	var data interface{}
	err := decoder.Decode(&data)
	if err != nil {
		panic(err)
	}

	receivedResult := data.(map[string]interface{})
	command := receivedResult["command"].(string)
	expectedResult := expectedResults[command]
	//fmt.Printf("EXPECTED RESULT: %v\n",expectedResult)
	if len(expectedResult) == 0 {
		t.Errorf("Command is not correct. '%s' not found in expected results.", command)
	}

	rec := receivedResult["data"].([]interface{})
	//fmt.Printf("RECEIVED RESULT: %v\n",rec)
	for j := 0; len(rec) > 0 && j < len(expectedResult); j++ {
		e1 := expectedResult[j]
		r1 := rec[j].(map[string]interface{})
		for e2 := range e1 {
			if r2, ok := r1[e2]; !ok {
				t.Errorf("Expected result '%s / %s' is missing.", e2, e1[e2])
			} else if e1[e2] != r2 {
				t.Errorf("Result is wrong. Expected: '%s / %s' and got: '%s / %s'\n", e2, e1[e2], e2, r2)
			}
		}
	}
}

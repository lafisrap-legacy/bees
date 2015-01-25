package main

import (
    "testing"
	"code.google.com/p/go.net/websocket"
	"encoding/json"
    _ "fmt"
    "strconv"
)
//import "fmt"

const (
    testloops int = 10000
)

type result struct {
    sid int
    data []map[string]string
}

func TestConnector(t *testing.T) {

	config := LoadConfig()
	if config == nil {
        panic(config)
	}

    requestChan, _ := StartDatabase(config)
    StartController(config, requestChan)

    origin := "http://localhost/"
    url := "ws://"+config["wsaddress"]+":"+config["wsport"]+config["wsdir"]
    ws, err := websocket.Dial(url, "", origin)
    if err != nil {
        panic(err)
    }

    requests := []string{
        "{\"command\":\"getBeehives\",\"sid\":\"1\"}",
        "{\"command\":\"loginBeehive\",\"beehive\":\"yaylaswiese\",\"secret\":\"tat\",\"sid\":\"2\"}",
        "{\"command\":\"loginBeehive\",\"beehive\":\"turiner21\",\"secret\":\"hierunddort\",\"sid\":\"3\"}",
    }

    expectedResults := map[int][]map[string]string{
        1 : {{
            "name":"Bienenstock Turinerstr. 21",
        },{
            "name":"Yayla's Wiese Bienenstock",
        }},
        2 : {{
            "id":"e1fb20276f11dc71f3005f3170731535b00ab427",
            "shortname":"yaylaswiese",
        }},
        3 : {{
            "id":"e47a4c8b7b20e76376dfafb0665b1611cf0aebbb",
            "shortname":"turiner21",
        }},
    }


    //for i:=0 ; i<len(requests) ; i++ {
    for i:=0 ; i<testloops ; i++ {

        if _, err := ws.Write([]byte(requests[i%len(requests)])); err != nil {
            panic(err)
        }
    }

    receiveResults(t, ws, expectedResults)
}

func receiveResults(t *testing.T, ws *websocket.Conn, expectedResults map[int][]map[string]string) {

    decoder := json.NewDecoder(ws)
    for i:=0 ; i<testloops ; i++ {

        var data interface{}
        err := decoder.Decode(&data)
        if err != nil {
            panic(err)
        }

        receivedResult := data.(map[string]interface{});
        sid, err := strconv.Atoi( receivedResult["sid"].(string) )
        expectedResult := expectedResults[sid]
        if len(expectedResult) == 0 {
            t.Errorf("Sid is not correct. '%d' not found in expected results.", sid )
            continue;
        }

        rec := receivedResult["data"].([]interface{})
        for j:=0 ; j<len(expectedResult) ; j++ {
            e1 := expectedResult[j];
            r1 := rec[j].(map[string]interface{})
            for e2 := range e1 {
                if r2, ok := r1[e2] ; !ok {
                    t.Errorf("Expected result '%s / %s' is missing.", e2 , e1[e2] )
                } else if e1[e2] != r2 {
                    t.Errorf("Result is wrong. Expected: '%s / %s' and got: '%s / %s'\n", e2 , e1[e2], e2 , r2 )
                }
            }
        }
    }
}



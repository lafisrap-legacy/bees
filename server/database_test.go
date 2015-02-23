package beeserver

import (
	"testing"
	//"fmt"
)

const (
	beehives = 2
)

func TestDatabase(t *testing.T) {

	config := LoadConfig()
	if config == nil {
		panic(config)
	}

	doneChan := make(chan bool)

	requestChan := StartDatabase(config, doneChan)

	testSignup(t, requestChan)
	testGetBeehives(t, requestChan)
	testLoginBeehive(t, requestChan)
}

func testGetBeehives(t *testing.T, requestChan chan Db_request) {

	dataChan := make(chan []Cmd_data)

	req := Db_request{
		request:   "getBeehives",
		dataChan:  dataChan,
		parameter: nil,
	}

	requestChan <- req
	data := <-dataChan

	if len(data) != beehives {
		t.Errorf("Number of beehives: %d, wanted: %d", len(data), beehives)
	}
}

func testLoginBeehive(t *testing.T, requestChan chan Db_request) {
	requests := []Db_request{{
		request: "loginBeehive",
		parameter: Cmd_data{
			"beehive": "yaylaswiese",
			"secret":  "tat",
		},
	}, {
		request: "loginBeehive",
		parameter: Cmd_data{
			"beehive": "yaylaswies",
			"secret":  "tat",
		},
	}, {
		request: "loginBeehive",
		parameter: Cmd_data{
			"beehive": "yaylaswiese",
			"secret":  "ta",
		},
	}, {
		request: "loginBeehive",
		parameter: Cmd_data{
			"beehives": "yaylaswiese",
			"secret":   "tat",
		},
	}}

	results := []map[string]string{{
		"id":        "e1fb20276f11dc71f3005f3170731535b00ab427",
		"shortname": "yaylaswiese",
	}, {
		"error": "Beehive 'yaylaswies' not found.",
	}, {
		"error": "Wrong secret.",
	}, {
		"error": "Parameter missing: beehive or secret.",
	},
	}

	for i := 0; i < len(requests); i++ {
		dataChan := make(chan []Cmd_data)
		requests[i].dataChan = dataChan

		requestChan <- requests[i]
		data := <-dataChan

		for res := range data[0] {
			if data[0][res] != results[i][res] {
				t.Errorf("LoginBeehive: Test %d: Return value '%s' failed. Wanted: '%s' got '%s'", i, res, results[i][res], data[0][res])
			}
		}
	}
}

func testSignup(t *testing.T, requestChan chan Db_request) {

	requests := []Db_request{{
		request: "signup",
		parameter: Cmd_data{},
	}}

	results := []map[string]string{{
		"playerId": "?",
	},}

	for i := 0; i < len(requests); i++ {
		dataChan := make(chan []Cmd_data)
		requests[i].dataChan = dataChan

		requestChan <- requests[i]
		data := <-dataChan

		for res := range data[0] {
			r, ok := data[0][res]
			if !ok {
				t.Errorf("signup: Test %d: Return value '%s' missing.", i, res)
			} else if r != results[i][res] && results[i][res] != "?" {
				t.Errorf("signup: Test %d: Return value '%s' failed. Wanted: '%s' got '%s'", i, res, results[i][res], data[0][res])
			}
		}
	}
}


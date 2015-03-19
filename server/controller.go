package beeserver

// Bees Controller, all application logic supposed to happen here

import (
	"fmt"
	"github.com/jimlawless/cfg"
	"log"
	"strconv"
	"time"
)

const (
	// time till inactive sessions are cleared
	sessionExpire time.Duration = 3000 * time.Second

	// interval for invitation information
	invitationInterval time.Duration = 1 * time.Second
)

// Command is the basic structure for controller commands
//	command		The name of the command
//	sid			Session id
//	dataChan	Back channel for result
//	parameter	Parameter for commands
type Command struct {
	command   string
	sid       string
	dataChan  chan []Cmd_data
	parameter Cmd_data
}

// Session is the basic structure for player sessions
type Session struct {
	playerId         string
	playerName       string
	sha1Sid          string
	beehive          *Beehive
	notificationChan *chan []Cmd_data
	variation        variation
	inviting         *Session // inviting the player of a session
	lastAccess       time.Time
}

var sessions map[string]*Session

// variation is a short name of a game variation
type variation string

// Beehive is the basic struture for beehive life
//	sessions	Array with all player sessions of a beehive
type Beehive struct {
	name     string
	sessions map[string]*Session
	invitees map[variation]map[string]*Session
}

var beehives map[string]*Beehive

// Cmd_data is a map for command parameter to and from the controller
type Cmd_data map[string]string

// StartServer initiates the beeserver. It starts off all three components
//	Database
//	Controller
//	Connector
func StartServer() chan bool {
	config := loadConfig()
	if config == nil {
		panic(config)
	}

	doneChan := make(chan bool)

	requestChan := StartDatabase(config, doneChan)
	commandChan := StartController(config, requestChan, doneChan)
	go StartConnector(config, commandChan, doneChan)

	return doneChan
}

// loadConfig load the config file "bees.cfg""
func loadConfig() map[string]string {
	m := make(map[string]string)
	err := cfg.Load("bees.cfg", m)
	if err != nil {
		log.Fatal(err)
	}

	return m
}

// StartController initiates the controller.
//	config		config options (currently not used)
//	requestChan	Channel for database request
//	doneChan	Channel for stopping the server or being stopped
func StartController(_ map[string]string, requestChan chan Db_request, doneChan chan bool) chan Command {

	fmt.Printf("Bees controller started. Waiting for commands ...\n")
	commandChan := make(chan Command)

	go handleCommands(commandChan, requestChan)

	return commandChan
}

// handleCommands is the main event loop for controller commands
//	commandChan		Channel to receive commands
//	requestChan		Channel to send requests
func handleCommands(commandChan chan Command, requestChan chan Db_request) {
	beehives = make(map[string]*Beehive)
	sessions = make(map[string]*Session)

	// fill available beehives into beehive map
	dataChan := make(chan []Cmd_data)
	request := Db_request{
		request:  "getBeehives",
		dataChan: dataChan,
	}
	requestChan <- request
	data := <-dataChan
	for i := 0; i < len(data); i++ {

		shortname, ok := data[i]["shortname"]
		if !ok {
			panic("Return value 'shortname' is missing.")
		}

		bh := Beehive{
			sessions: make(map[string]*Session),
			invitees: make(map[variation]map[string]*Session),
		}

		beehives[shortname] = &bh

		fmt.Printf("Adding beehive %s\n", shortname)
	}

	sessionTicker := time.NewTicker(sessionExpire)
	invitationTicker := time.NewTicker(invitationInterval)
	for {
		select {
		case cmd := <-commandChan:
			go commandInterpreter(cmd, requestChan)
		case <-sessionTicker.C:
			go expireSession()
		case <-invitationTicker.C:
			go sendInvitation()
		}
	}
}

// commandInterpreter distributes commands to the appropriate logic, e.g. database call or
// session handling.
//	cmd			Command struct
//	requestChan	Channel for sending database request
func commandInterpreter(cmd Command, requestChan chan Db_request) {

	dataChan := make(chan []Cmd_data)

	var session *Session
	var ok bool
	if cmd.sid != "" {
		// look for session
		if session, ok = sessions[cmd.sid]; ok {
			session.lastAccess = time.Now()
		} else {

			cmd.dataChan <- []Cmd_data{{
				"error": "Session ID (" + cmd.sid + ") is not valid. " + strconv.Itoa(len(sessions)) + " sessions in list.",
			}}
			return
		}
	}

	request := Db_request{
		request:   cmd.command,
		session:   session,
		dataChan:  dataChan,
		parameter: cmd.parameter,
	}

	switch cmd.command {
	// database commands with no modifications by controller (pass through to database)
	case "loginBeehive":
		fallthrough
	case "getBeehives":
		fallthrough
	case "saveState":
		fallthrough
	case "signup":
		fallthrough
	case "signoff":
		requestChan <- request
		cmd.dataChan <- <-dataChan
	// database commands with modifications
	case "login":
		requestChan <- request
		data := <-dataChan

		_, err := data[0]["error"]
		if !err {
			playerName, ok := cmd.parameter["playerName"]
			if !ok {
				playerName = "N.N."
			}

			// register session
			sid := GetHash(nil)
			beehive := beehives[data[0]["beehive"]]
			session = &Session{
				playerId:   GetHash([]byte(cmd.parameter["playerId"])),
				playerName: playerName,
				beehive:    beehive,
				sha1Sid:    GetHash([]byte(sid)),
				lastAccess: time.Now(),
			}
			sessions[sid] = session
			// tell beehive that session is active
			beehive.sessions[sid] = session

			// set return value
			data[0]["sid"] = sid
		}

		cmd.dataChan <- data
	case "logout":
		logout(&(cmd.sid))

		cmd.dataChan <- []Cmd_data{}
	// pure controller commands ()
	case "registerVariation":
		vid, ok := cmd.parameter["variation"]
		if ok {
			session.variation = variation(vid)

			fmt.Println("registerVariation:", session)
		} else {
			cmd.dataChan <- []Cmd_data{{
				"error": "Parameter 'variation' missing.",
			}}
		}

		cmd.dataChan <- []Cmd_data{}
	case "acceptInvitations":
		if session.variation != "" {
			fmt.Println("acceptInvitations:")
			vari, ok := session.beehive.invitees[session.variation]
			if !ok {
				vari = make(map[string]*Session)
				fmt.Println("acceptInvitations variation:", vari)
				session.beehive.invitees[session.variation] = vari
			}
			fmt.Println("acceptInvitations cmd.sid:", cmd.sid)
			vari[cmd.sid] = session
		} else {
			cmd.dataChan <- []Cmd_data{{
				"error": "Variation not registered. Use 'registerVariation' command.",
			}}
		}
		fmt.Printf("acceptInvitations: true.\n")
		cmd.dataChan <- []Cmd_data{}
	case "invite":
		// parameters: encr. sid
		// rets: ok
	case "stopInvitations":
		stopInvitations(&(cmd.sid))
		cmd.dataChan <- []Cmd_data{}
	default:
		cmd.dataChan <- []Cmd_data{{
			"error": "Command not available.",
		}}
	}
}

func setNotificationChan(notificationChan chan []Cmd_data, sid string) {
	sessions[sid].notificationChan = &notificationChan
}

func logout(sid *string) {

	stopInvitations(sid)
	delete(sessions, *sid)

	fmt.Println("Logging out", sid, ".")
}

func stopInvitations(sid *string) {

	session := sessions[*sid]

	delete(session.beehive.invitees[session.variation], *sid)

	if len(session.beehive.invitees[session.variation]) == 0 {
		delete(session.beehive.invitees, session.variation)
	}

	fmt.Printf("acceptInvitations: false.\n")
}

// expireSession deletes all sessinos that are not used anymore. Relogin required after ...
func expireSession() {
	now := time.Now()
	for sid := range sessions {
		if now.After(sessions[sid].lastAccess.Add(sessionExpire)) {
			delete(sessions, sid)
			fmt.Println("Deleting", sid, "from sessions.")
		}
	}
}

// sendInvitations sends invitation list to all accepting players
func sendInvitation() {
	for b := range beehives {
		invitees := beehives[b].invitees
		for variation := range invitees {
			varSessions := invitees[variation]
			fmt.Println(len(varSessions), "to send to with variation", variation, ". Length:", len(varSessions))
			if len(varSessions) > 1 {
				for sid := range varSessions {
					data := make([]Cmd_data, 0)
					for s := range varSessions {
						var inviting, invited string = "no", "no"
						if varSessions[s].inviting == varSessions[sid] {
							inviting = "yes"
						}
						if varSessions[sid].inviting == varSessions[s] {
							invited = "yes"
						}

						if sid != s {
							data = append(data, Cmd_data{
								"sid":      varSessions[s].sha1Sid,
								"name":     varSessions[s].playerName,
								"inviting": inviting,
								"invited":  invited,
							})
						}
					}
					*(varSessions[sid].notificationChan) <- data
				}
			}
		}
	}
}

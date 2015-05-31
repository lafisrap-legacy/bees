# To Do

## Next
* Leave a trace at sunk ships, and at already hit places
* make borders thick
* Lets hit parts only turn 90 degrees
* Turn all hit parts black
* set in new font from Dieter
* Let a red ship go from left to right
* find a solution for the hourglass
* say some more results
* work on text timing
* set in fire, smoke and water effects
* Input name, boy/girl

## Later
* Auto-Logout
	* Connection break
	* Relogin from client?
* Computer-Player
	* Register computer player
	* Modify connectPlayer to support it
	* Modify sendUpdate to support it
* Internet/No Internet
	* Test different scenarios
	* Reconnecting games
	* "Player lost ..."
	* Server is started while clients are running, how do they 
	* Display a connection sign
	* recover?
* Invite multiple players
* nmp for jsfmt (jslint?)
* Choose player on web (add local password)


## rebuild 
* Read questions into database
* Session (Server side, memory):
	* see code 
* Variations: 
	* see code
* Sphinx Questions (new table!)
	* Question
	* Right answers (own table?)
	* Wrong answers
	* Stats: Answered %, Time, Like it's!
	* Creator (Player or game developer)
	* Creation date
* Plays: (not!)
* Game Status "Word Battle" (Client side):
	* Current variant
	* Solved paragraphs
	* Current paragraph
	* Solved words (current score)
	* sphinx questions
	* Own Ships
		* x,y position
		* rotation
		* word (index)
		* paragraph (index)
	* Discovered Ships
		* x,y position
		* rotation
		* letters detected (bit coded)
		* word (index)
		* paragraph (index)
		* destroyed by
	* Hits on own ships
		* index position
	* Hits on foreign ships
		* x,y position
		* letter

* For web client: enter magic spell at the beginning
	* create magic spell on signup

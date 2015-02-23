# To Do
* Next Steps
	* Adding database and command structure for word battle to design doc
		* specially: get together 
	* Creating a standalone and an embedded game stub
	* Programming a simple get 
* Testing Spine
* Romans Font
* Different names:
	* refreshSession
* Game standalone / in beehive
* Utilities
	* Read md-texts into database (paragraphs, w/ image urls) Update or rebuild 
	* Read questions into database
* Session (Server side, memory):
	* Current game
	* Current invitations (who, whom)
	* Current plays (who with whom ... sending JSON)
* Variations: 
	* Game type (e.g. Word Battle)
	* Name (e.g. Das Eselein)
	* Rounds (e.g. paragraphs, own table!)
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
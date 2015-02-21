# To Do
* Testing Spine
* Romans Font
* Different names:
	* refreshSession
* Utilities
	* Read md-texts into database (paragraphs, w/ image urls) Update or rebuild 
* Variations: 
	* Game type (e.g. Word Battle)
	* Name (e.g. Das Eselein)
	* Rounds (e.g. paragraphs)
	* Sphinx Questions (new table!)
		* Question
		* Right answers (own table?)
		* Wrong answers
		* Stats: Answered %, Time, Like its!
		* Creator (Player or game developer)
		* Creation date
* Plays: 
	* 
* Session (Server side):
	* Current game
	* Current invitations (who, whom)
	* Current plays (who with whom ... sending JSON)
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
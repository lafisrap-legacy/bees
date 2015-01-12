# Database Design for bees Server
* Version 0.1
* * 12.1.2015
## Abstract
This document contains the database structural design for bees server. It is strictly game type independent, meaning no structural elements refer to specific game types or variations.
## Tables Overview
* **player**: All players identified by their SHA1 hash, password, bee hive
* **beehives**: All beehives with there enrry code and maintainer
* **games**: All available games
* **variations**: All available variations of games
* **plays**: All plays certain players hav played, with result
* **achievments**: All achivments players won while playing variations
* **contributions**: All contributions player made to a variation, coded in JSON

Live game content is not stored in the database.

## Table definitions
### player
id: Original SHA1 hash of name and password of player
password: Current SH1 hash of name and password (after name or password change) 
### beehive
name: Name of the beehive
secret: Code word to gain access to a beehive (plain text) 
### game
name: Name of the game
id: id of the game
### variations
name: Name of the variation
id: id of the variation
### plays
id: id of play
player: players hash
### achievments
id: id of achievment
player: players hash
game: game id
variation: variation id
description: JSON data describing the achievment
### contributions
id: if of contribution
player: contributing player
description: JSON data describing the contribution

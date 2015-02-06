# Database / Server Commands Design
* Version 0.1
* * 12.1.2015

## Abstract

This document contains the database structural design for bees server and the commands of the bees controller. It is strictly game type independent, meaning no structural elements refer to specific game types or variations.  

## Commands Overview

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

### players
**id**: Original SHA1 hash of name and password of player  
**beehive**: beehiveId  
**magicSpell**: Magic Spell to take over a player id

### beehive
**id**: Machine name of a beehive
**name**: Name of the beehive  
**secret**: Code word to gain access to a beehive (plain text)  

### game
**id**: machine readable name of the game / Reference to github   
**name**: Name of the game  
**git**: Git hash of game resources   

### variations
**name**: Name of the variation  
**id**: Machine readable name / git directory  

### plays
**id**: id of play  
**player**: players hash  
**success**: outcome of the game

### achievments
**id**: id of achievment  
**player**: players hash  
**game**: game id  
**variation**: variation id  
**play**: play id
**achievment**: JSON data describing the achievment  

### contributions
**id**: if of contribution  
**player**: contributing player  
**description**: JSON data describing the contribution  

## Commands
### signup
-> Handed through to signup request
### login
#### Params
* playerId

#### Result  
* sessionId

##### Tasks
* Check for double login, and in case logout the other 
* Check for playerId in Database
* Create a session id, bind it to the playerId in memory ???

## Requests
### signup
#### Params  
* magicSpell or nil

#### Result
* playerId

#### Tasks
* If no magic spell is given, create playerId (SHA1 hash) and set home beehive to default
* If so then find corresponding playerId

### login
#### Params
* playerId

#### Result  
* sessionId

* 


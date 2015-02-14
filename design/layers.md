# Layer-Design for Bees Client
* Version 0.1
* * 6.2.2015

## Abstract

This document contains the layer design for the bees client. It builds on the layer structure of cocos2d-js.

## Layers Overview
* **WebLayer** (/cc.Layer) Layer for all websocket communication with server, database and other clients. Login, mail etc.
* **GameLayer** (/cc.Layer) Basic layer for single games
* **TitleLayer** (/cc.Layer) Layer for title and game startup
* **MenuLayer** (/cc.Menu) Layer for moving menus
* **ScoreLayer** (/cc.Layer) Layer for game scores and beehive frames
* **OverviewLayer** (/cc.Layer) Layer for games overview
* **SphinxLayer** (/cc.gameLayer) Layer for Sphinx interaction game
* **QuestionsLayer** (/cc.gameLayer) Layer for player questions

## Layers methods
### communicationsLayer
#### Layer Globals
playerId, string[40]  
sessionId, string[40]  

#### Method: signup
##### Params  
* opt: magicSpell

##### Result 
* playerId

##### Tasks 
Call server signup function

##### Description
This method is called when there is no playerId available in local cache, or if playerId is not valid for login.
#### Method: login
##### Params
* playerId

##### Results
* sessionId 

##### Tasks 
Call server login function

##### Description
Login retrieves a session id (SHA1 hash), that is needed for every communication with the server
#### ping
#### refresh
#### getMagicSpell


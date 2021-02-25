# Applebot, the Discord Bot
A multi-function NodeJS bot for the Discord application.

## Overview 


## Table of Contents
1. Installation
2. Commands
3. Authors

<hr/>

## Installation


This project requires NodeJS and NPM to be installed, as well as various dependencies. <br>
Clone the repository and install the dependencies with:
```sh
git clone https://github.com/oscarsandford/Applebot.git
cd Applebot
npm install
```

Requires API keys for Discord and MongoDB. Add them as environment variables as needed. 
Run the app in a development environment with:
```sh
npm start
```


## Commands
*(run these in your server when the bot is installed and online)*

```js
hi apple        		// says hi back
$drawaugust or $da		// draw a card from the August Trading Cards collection
$mycollection or $ma  		// display the message author's card collection
$drawtarot or $dt		// draw a card from the Tavern Arcana
$describecard <cname>	// returns a preview of the card with cname, if it exists
$resetmc     			// reset the card collection of the user that called it
```

Moderator only (needs BAN_MEMBERS permission):
```js
$purge <int>    		// remove the last <int> messages in the current channel, up to 50
$kick <@user>   		// kicks mentioned user from the current server
$ban <@user>   			// bans mentioned user from the current server
$resetcd        		// reset the card draw cooldown timer for the message author
$resetmc <@user>     		// reset a user's card collection
```

## Authors
Created by Oscar Sandford.

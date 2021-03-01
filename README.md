# Applebot, the Discord Bot
A multi-function Discord.js bot running in Node.js for Discord servers.
<hr>

## Table of Contents
1. Installation
2. Commands
3. Authors

<hr>

## Installation

This project requires [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) to be installed, as well as the dependencies in `package.json`. <br>
Clone the repository and install the dependencies with
```sh
$ git clone https://github.com/oscarsandford/Applebot.git
$ cd Applebot
$ npm install
```

It requires API keys for Discord and MongoDB. Add them as environment variables as needed, or use the code in this repository as a starting point for your own systems. <br>
Run the app in a development environment with
```sh
$ npm start
```

<hr>

## Commands
*(run these in the chat box of your Discord server when the bot is installed and online)*

```js
hi apple        		// returns a response greeting based on the time of day
$drawaugust or $da		// draw a card from the August Trading Cards collection
$mycollection or $ma  		// display the message author's card collection
$drawtarot or $dt		// draw a card from the Tavern Arcana
$describecard <cname>		// returns a preview of the card with cname, if it exists
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

<hr>

## Authors
Created by Oscar Sandford.

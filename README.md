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
$ git clone https://github.com/oscarsandford/applebot.git
$ cd applebot
$ npm ci
```

It requires API keys for Discord and MongoDB. Add them as environment variables as needed in a new file `src/devconf.json`. Otherwise, use the code in this repository as a starting point for your own systems. <br>
Run the app in a development environment with
```sh
$ npm start
```
Run `node src/deploy-cmds.js` to apply the slash commands.

<hr>

## Commands
*(run these in the chat box of your Discord server when the bot is installed and online)*
**This is pretty outdated and will be updated when all commands are reimplemented.**

```js
hi apple        		// Returns a response greeting based on the time of day
$drawaugust or $da		// Draw a card from the August Trading Cards collection
$mycollection or $ma  		// Display the message author's card collection
$drawtarot or $dt		// Draw a card from the Tavern Arcana
$describecard card_name		// Returns a preview of the card with card_name, if it exists
$resetmc     			// Reset the card collection of the user that called it
$quote or $dq 			// Returns a random quote out of context
$quote @user funny quote	// Adds "funny quote" to the list of @user's quotes
$quotethat			// Quote the sender of the last message sent before this command
$findquote funny			// Returns random quote with given substring
```

Moderator only (needs BAN_MEMBERS permission):
```js
$purge int   		// Remove the last int messages in the current channel, up to 50
$kick @user   		// Kicks mentioned user from the current server
$ban @user   		// Bans mentioned user from the current server
$resetcd        	// Reset the card draw cooldown timer for the message author
$resetmc @user    	// Reset a user's card collection
$unquote @user funny 	// Removes quotes that include the given substring (removes "funny quote")
```

<hr>

## Authors
Created by Oscar Sandford.

// Discord
const Discord = require("discord.js");
const discord_client = new Discord.Client();
const prefix = "$";

// MongoDB
const mongo = require("mongodb").MongoClient;
const mdb_db = "tavern";
const mdb_collection = "user_collections";

// Gacha decks JSON
let fs = require("fs");
let trading_cards = JSON.parse(fs.readFileSync("gacha_decks/cards.json", "utf-8"));
let tarot_cards = JSON.parse(fs.readFileSync("gacha_decks/tavernarcana.json", "utf-8"));
let weights = [1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4,5];

// Sets for users on cooldown for drawing from these decks
const recently_drawn = new Set();
const recently_drawn_tarot = new Set();

// Startup
discord_client.once("ready", () => {
	console.log("<> Apple Activated <>");
});

// Catch each message and check it...
discord_client.on("message", message => {
	if (!message.guild) return;

	// Moderator only commands (users with kick and ban permissions)
	if (message.member.hasPermission(["KICK_MEMBERS", "BAN_MEMBERS"])) {
		// Kick member
		if (message.content.startsWith(`${prefix}kick`)) {
			if (message.content.length < 7) return;
			let member = message.mentions.members.first();
			member.kick().then((member) => {
				message.channel.send(member.displayName+" got the boot!"+" :boot:")
			})
		}
		// Ban member
		if (message.content.startsWith(`${prefix}ban`)) {
			if (message.content.length < 6) return;
			let member = message.mentions.members.first();
			member.ban().then((member) => {
				message.channel.send(member.displayName+" got MC Hammer'd!"+" :hammer:")
			})
		}
		// Purge last <int> messages, up to 50
		if (message.content.startsWith(`${prefix}purge`)) {
			let amount = "";
			for (i = 7; i < message.content.length; i++) {
				amount += message.content.charAt(i);
			}
			let targets = Number(amount);
			if ( targets > 0 && targets < 51) {
				message.channel.bulkDelete(targets + 1);
				message.channel.send(targets+" message(s) successfully deleted.");
			}
			else {
				message.channel.send(targets+" is an invalid quantity.");
			}
		}
		// Reset card draw cooldown for the given user
		if (message.content.startsWith(`${prefix}resetcd`)) {
			if (message.content.length < 10) return;
			let member = message.mentions.members.first().user;
			recently_drawn.delete(member.id);
			recently_drawn_tarot.delete(member.id);
			message.channel.send("Draw timer reset for "+member.username+".");
		}
	}

	// Reset card collection of self or given user
	if (message.content.startsWith(`${prefix}resetmc`)) {
		let member = "";
		// Reset collection of self
		if (message.content.length < 10) {
			member = message.author;
		}
		// Admin only: reset specific user collection
		else {
			if (!message.member.hasPermission(["KICK_MEMBERS", "BAN_MEMBERS"])) return;
			member = message.mentions.members.first().user;
		}
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) throw err;
			let db = client.db(mdb_db);
			db.collection(mdb_collection).deleteMany({discord_id : member.id});
		});
		message.channel.send("Collection reset for "+member.username+".");
	}

	// Switch on message EXACT contents
	switch (message.content) {
		case "hi apple":
			message.channel.send("Good day, "+message.author.username+"! :apple:");
			break;
	
		// Displays the message sender's card collection
		case `${prefix}mycollection`:
		case `${prefix}mc`:
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let items = await db.collection(mdb_collection).find({discord_id : message.author.id}).toArray();
				client.close();
	
				const collection_embed = new Discord.MessageEmbed()
					.setTitle(message.author.username + "'s Collection")
					.setColor("DARK_GOLD");
				
				items.sort((a, b) => (a > b) ? 1 : -1);
				let count = 0;

				items.forEach(el => {
					let n = el["card"]["name"] +" +"+ el["card"]["level"];
					let v = ":star:".repeat(el["card"]["rank"]);
					collection_embed.addField(n, v, true);
					count++;
				});
				collection_embed.setDescription(count+" entries.");
				message.channel.send(collection_embed);
			});
			break;

		// Draw card from august deck and add to sender's collection
		case `${prefix}drawaugust`:
		case `${prefix}da`:
			if (!recently_drawn.has(message.author.id)) {
				// Pick a random ranking
				let rand_rank = weights[Math.floor(Math.random()*weights.length)];
				// Get a random card with rank LEQ the random rank
				let selected_cards = trading_cards.filter((c) => c["rank"] <= rand_rank);
				let c = selected_cards[Math.floor(Math.random() * selected_cards.length)];

				message.channel.send(
					new Discord.MessageEmbed()
					.setTitle(c["name"] + " +" + c["level"])
					.setDescription(":star:".repeat(c["rank"]))
					.setImage(c["imglink"])
					.setColor("DARK_GREEN")
					.setFooter("August Trading Cards")
				);
					
				mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
					if (err) throw err;
					let db = client.db(mdb_db);
					// If drawn card in user collection, increment the card's level and replace it with the incremented card
					let card_exists = await db.collection(mdb_collection).findOne({discord_id : message.author.id, card : c});
					if (card_exists) {
						await db.collection(mdb_collection).deleteOne({discord_id : message.author.id, card : c});
						c["level"]++;
					}
					await db.collection(mdb_collection).insertOne({discord_id : message.author.id, card : c});
					client.close();
				});
	
				// User cannot draw from a deck again for some time
				recently_drawn.add(message.author.id);
				setTimeout(function(){
					recently_drawn.delete(message.author.id);
				}, 600000);
			}
			else {
				message.channel.send("You must wait some time before drawing again.");
			}
			break;

		// Draw card from tavern tarot and add to sender's collection
		case `${prefix}drawtarot`:
		case `${prefix}dt`:
			if (!recently_drawn_tarot.has(message.author.id)) {
				// Only select a card if it has a image to display
				let c = {};
				do {
					c = tarot_cards[Math.floor(Math.random() * tarot_cards.length)];
				} while (c["imglink"] == "");

				message.channel.send(
					new Discord.MessageEmbed()
					.setTitle(c["numeral"] + " : " + c["name"] + " " + c["emoji"])
					.setDescription(c["description"])
					.setImage(c["imglink"])
					.setColor("DARK_RED")
					.setFooter("Tavern Arcana")
				);
	
				// User cannot draw from a deck again for some time
				recently_drawn_tarot.add(message.author.id);
				setTimeout(function(){
					recently_drawn_tarot.delete(message.author.id);
				}, 60000);
			}
			else {
				message.channel.send("You must wait some time before drawing again.");
			}
			break;
	}

});  // end of message capture

discord_client.login(process.env.DISCORD_KEY);
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
let weights = [
	1,1,
	2,2,2,2,
	3,3,3,3,3,
	4,4,4,4,4,
	5,5,5,5
];

// Sets for user on cooldown for drawing from decks
const recently_drawn = new Set();
const recently_drawn_tarot = new Set();

// Startup
discord_client.once("ready", () => {
	console.log("<> Apple Activated <>");
});

// Set env vars from local config if not in production
if (process.env.NODE_ENV !== "production") {
	console.log("Development Mode");
	const {dbstr, disckey} = require("./config.json");
	process.env.DB_CONNECTION_STRING = dbstr;
	process.env.DISCORD_KEY = disckey;
}

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
			});
		}
		// Ban member
		if (message.content.startsWith(`${prefix}ban`)) {
			if (message.content.length < 6) return;
			let member = message.mentions.members.first();
			member.ban().then((member) => {
				message.channel.send(member.displayName+" got MC Hammer'd!"+" :hammer:")
			});
		}
		// Purge last <int> messages, up to 50
		if (message.content.startsWith(`${prefix}purge`)) {
			let amount = "";
			for (i = 7; i < message.content.length; i++) {
				amount += message.content.charAt(i);
			}
			let targets = Number(amount);
			if (targets > 0 && targets < 51) {
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

	// Describe a specific card given by an argument to this command
	if (message.content.startsWith(`${prefix}describecard`)) {
		if (message.content.length < 15) return;
		let arg = message.content.slice(14, message.content.length).toLowerCase();
		// Check both card collections for a matching name
		let tarot_result = tarot_cards.find((c) => c["name"].toLowerCase() == arg);
		let trading_result = trading_cards.find((c) => c["name"].toLowerCase() == arg);
		
		if (tarot_result) {
			message.channel.send(
				new Discord.MessageEmbed()
				.setTitle(tarot_result["numeral"] + " : " + tarot_result["name"] + " " + tarot_result["emoji"])
				.setDescription(tarot_result["description"])
				.setImage(tarot_result["imglink"])
				.setColor("DARK_RED")
				.setFooter("Tavern Arcana")
			);
		}
		else if (trading_result) {
			message.channel.send(
				new Discord.MessageEmbed()
				.setTitle(trading_result["name"] + " +" + trading_result["level"])
				.setDescription(":star:".repeat(trading_result["rank"]))
				.setImage(trading_result["imglink"])
				.setColor("DARK_GREEN")
				.setFooter("August Trading Cards")
			);
		}
		else {
			message.channel.send("Can't find that card in any deck.");
		}
	}

	// Match exact, case-insensitive message contents
	switch (message.content.toLowerCase()) {
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
				
				// Select sort displayed cards in desc order
				let i, j;
				for (i = 0; i < items.length; i++) {
					for (j = i+1; j < items.length; j++) {
						if (items[j]["card"]["rank"] > items[i]["card"]["rank"]) {
							[items[i], items[j]] = [items[j], items[i]];
						}
					}
				}

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
				setTimeout(() => {
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
				let cards = [];
				// Get three unique cards
				//  - first one is primary
				//  - second is its reverse, or warning
				//  - third is some more advice
				while (cards.length < 3) {
					let c;
					do {
						c = tarot_cards[Math.floor(Math.random() * tarot_cards.length)];
					} while (c["imglink"] == "" || cards.includes(c));
					cards.push(c);
				}

				// For lucky main draws on The World. Yes, this is a JoJo reference!
				if (card[0]["id"] === 21) {
					card[0]["description"] = "I, "+ message.author.username+", have a dream!";
				}

				message.channel.send(
					new Discord.MessageEmbed()
					.setTitle(cards[0]["numeral"] + " : " + cards[0]["name"] + " " + cards[0]["emoji"])
					.setDescription(cards[0]["description"])
					.addFields(
						{ 
							name: cards[1]["name"] + " " + cards[1]["emoji"], 
							value: cards[1]["reverse"] + "...", 
							inline: true 
						},
						{ 
							name: cards[2]["name"] + " " + cards[2]["emoji"], 
							value: "..." + cards[2]["advice"], 
							inline: true 
						}
					)
					.setImage(cards[0]["imglink"])
					.setColor("DARK_RED")
					.setFooter("Tavern Arcana")
				);
				
				// User cannot draw from a deck again for some time
				recently_drawn_tarot.add(message.author.id);
				setTimeout(() => {
					recently_drawn_tarot.delete(message.author.id);
				}, 14400000);
			}
			else {
				message.channel.send("You must wait some time before drawing again.");
			}
			break;
	}

});  // end of message capture

discord_client.login(process.env.DISCORD_KEY);
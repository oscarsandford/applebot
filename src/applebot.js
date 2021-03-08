// Discord
const Discord = require("discord.js");
const discord_client = new Discord.Client();
const prefix = "$";

// MongoDB
const mongo = require("mongodb").MongoClient;
const mdb_db = "tavern";
const mdb_user_collections = "user_collections";
const mdb_user_quotes = "user_quotes";

// Gacha decks JSON
const fs = require("fs");
const cards_trading = JSON.parse(fs.readFileSync("src/resources/cards.json", "utf-8"));
const cards_tarot = JSON.parse(fs.readFileSync("src/resources/tavernarcana.json", "utf-8"));
const weights = [
	1,1,1,
	2,2,2,2,2,
	3,3,3,3,3,3,
	4,4,4,4,
	5,5,
];

// Sets for user on cooldown for drawing from decks
const recently_drawn = new Set();
const recently_drawn_tarot = new Set();

// Import modules
const admin_module = require("./functions/admin.js");
const user_module = require("./functions/user.js");
const collections_module = require("./functions/collections.js");
const quotes_module = require("./functions/quotes.js");

// Startup
discord_client.on("ready", () => {
	console.log("> Apple Activated");
	// Development mode status to indicate "in maintenance" :)
	if (process.env.NODE_ENV !== "production") {
		discord_client.user.setPresence({
			status : "dnd",
			activity : {
				name : "some idiot code me.",
				type : "WATCHING"
			}
		});
	}
});

// DEVELOPMENT MODE for local testing.
// You can make your own devconf.json with the relevant fields.
if (process.env.NODE_ENV !== "production") {
	console.log("> Development Mode - Auto Start");
	const {dbstr, disckey} = require("./devconf.json");
	process.env.DB_CONNECTION_STRING = dbstr;
	process.env.DISCORD_KEY = disckey;
}


// Catch each message and check it...
discord_client.on("message", message => {
	if (!message.guild) return;

	// Define an admin as a user who has the kick and ban permissions.
	const author_is_admin = message.member.hasPermission(["KICK_MEMBERS", "BAN_MEMBERS"]);
	const user_mentioned = message.mentions.members.first();

	if (author_is_admin) {
		// Kick member
		if (message.content.startsWith(`${prefix}kick`) && user_mentioned) {
			admin_module.kick(user_mentioned, message);
		}
		// Ban member
		if (message.content.startsWith(`${prefix}ban`) && user_mentioned) {
			admin_module.ban(user_mentioned, message);
		}
		// Purge last <int> messages, up to 50
		if (message.content.startsWith(`${prefix}purge`)) {
			let count = message.content.split(" ");
			if (count[1]) admin_module.purge(count[1], message);
		}
		// Reset card draw cooldown for the given user
		if (message.content.startsWith(`${prefix}resetcd`) && user_mentioned) {
			admin_module.resetcd(user_mentioned, [recently_drawn, recently_drawn_tarot], message);
		}
		// Delete quotes based on if they contain a given substring, case insensitive
		if (message.content.startsWith(`${prefix}unquote`)) {
			let substr = message.content.split(" ").slice(1,).join(" ");
			if (quotes_module.remove_quotes(mongo, mdb_db, mdb_user_quotes, 
				substr.toLowerCase()
			)) {
				message.react("👍");
			}
		}
	}

	// Reset card collection of self or given user
	if (message.content.startsWith(`${prefix}resetmc`)) {
		let target = "";
		// Reset mentioned user's collection (admin) or their own (not admin)
		if (user_mentioned && author_is_admin) {
			target = user_mentioned.user;
		}
		else {
			target = message.author;
		}
		collections_module.resetmc(mongo, mdb_db, mdb_user_collections, target, message);
	}

	// Describe a specific card given by an argument to this command
	if (message.content.startsWith(`${prefix}describecard`)) {
		if (message.content.length > 14) {
			let target = message.content.slice(14, message.content.length).toLowerCase();
			// Check both card collections for a matching name
			let result = collections_module.describecard(target, cards_trading, cards_tarot);
			if (result["deck"] === "tarot_cards") {
				message.channel.send(
					new Discord.MessageEmbed()
					.setTitle(result["numeral"] + " : " + result["name"] + " " + result["emoji"])
					.setDescription(result["description"])
					.setImage(result["imglink"])
					.setColor("DARK_RED")
					.setFooter("Tavern Arcana")
				);
			}
			else if (result["deck"] === "trading_cards") {
				message.channel.send(
					new Discord.MessageEmbed()
					.setTitle(result["name"] + " +" + result["level"])
					.setDescription(":star:".repeat(result["rank"]))
					.setImage(result["imglink"])
					.setColor("DARK_GREEN")
					.setFooter("August Trading Cards")
				);
			}
			else {
				message.react("😐");
			}
		}
	}

	// Adds the mentioned user's quote to the database
	if (message.content.startsWith(`${prefix}quote`) && user_mentioned) {
		let quote = message.content.split(" ").slice(2,).join(" ");
		if (quotes_module.add_quote(mongo, mdb_db, mdb_user_quotes, 
			user_mentioned.user.id, quote, message.author.id
		)) {
			message.react("👍");
		}
	}
	
	// Match exact, case-insensitive message contents
	switch (message.content.toLowerCase()) {
		case "hi apple":
			user_module.apple_response(message);
			break;
	
		// Returns a random quote from the quotes collection
		case `${prefix}quote`:
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let all_quotes = await db.collection(mdb_user_quotes).find().toArray();
				client.close();
				// Select a random quote
				let rquote = all_quotes[Math.floor(Math.random()*all_quotes.length)];
				let quotee_user = await discord_client.users.fetch(rquote["quotee"]);
				let quotee_guild_user = message.guild.member(quotee_user);
				// Wrap some quotation marks around the quote if it doesn't have any
				if (!rquote["quote_text"].startsWith("\"")) {
					rquote["quote_text"] = "\""+rquote["quote_text"]+"\"";
				}
				// If the quotee is in the current guild (server), we take print their nickname besides 
				// their quote. Otherwise, we just make use of their current Discord username, which is global.
				if (quotee_guild_user) {
					message.channel.send("*"+rquote["quote_text"]+"* \t- "+quotee_guild_user.nickname);
				}
				else {
					message.channel.send("*"+rquote["quote_text"]+"* \t- "+quotee_user.username);
				}
			});
			break;

		// Displays the message sender's card collection
		case `${prefix}mycollection`:
		case `${prefix}mc`:
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let items = await db.collection(mdb_user_collections).find({discord_id : message.author.id}).toArray();
				client.close();
			
				const collection_embed = new Discord.MessageEmbed()
					.setTitle(message.author.username + "'s Collection")
					.setColor("DARK_GOLD");

				collections_module.sort_mycollection(items);
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
				let c = collections_module.pick_drawtrading(cards_trading, weights);
				// For some reason I have to set the level to 0 manually.
				c["level"] = 0;

				message.channel.send(
					new Discord.MessageEmbed()
					.setTitle(c["name"] + " +" + c["level"])
					.setDescription(":star:".repeat(c["rank"]))
					.setImage(c["imglink"])
					.setColor("DARK_GREEN")
					.setFooter("August Trading Cards")
				);
				
				collections_module.add_drawtrading(mongo, mdb_db, mdb_user_collections, message.author.id, c);
				collections_module.set_cooldown(message.author.id, recently_drawn, 600000);
			}
			else {
				message.react("⏳");
			}
			break;

		// Draw card from tavern tarot and add to sender's collection
		case `${prefix}drawtarot`:
		case `${prefix}dt`:
			if (!recently_drawn_tarot.has(message.author.id)) {
				let cards = collections_module.pick_draw3tarot(cards_tarot, message.author.username);

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

				collections_module.set_cooldown(message.author.id, recently_drawn_tarot, 14400000);
			}
			else {
				message.react("⏳");
			}
			break;
	}

});  // end of message capture

discord_client.login(process.env.DISCORD_KEY);
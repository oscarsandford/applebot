// Discord
const { MessageEmbed, Client, Intents, Permissions } = require("discord.js");
const discord_client = new Client({intents : [
	Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, 
	Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.GUILD_MESSAGE_REACTIONS
]});
const prefix = "$";

// MongoDB
const mongo = require("mongodb").MongoClient;
const mdb_db = "tavern";
const mdb_user_collections = "user_collections";
const mdb_user_quotes = "user_quotes";

// Gacha decks.
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
discord_client.on("messageCreate", message => {
	if (!message.guild) return;

	// Define an admin as a user who has ban permissions.
	const author_is_admin = message.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS);
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
	else if (message.content.startsWith(`${prefix}describecard`) && message.content.length > 14) {
		let target = message.content.slice(14, message.content.length).toLowerCase();
		// Check both card collections for a matching name
		let result = collections_module.describecard(target, cards_trading, cards_tarot);
		if (result["deck"] === "tarot_cards") {
			message.channel.send({embeds : [
				new MessageEmbed()
				.setTitle(result["numeral"] + " : " + result["name"] + " " + result["emoji"])
				.setDescription(result["description"])
				.setImage(result["imglink"])
				.setColor("DARK_RED")
				.setFooter("Tavern Arcana")
			]});
		}
		else if (result["deck"] === "trading_cards") {
			message.channel.send({embeds : [
				new MessageEmbed()
				.setTitle(result["name"] + " +" + result["level"])
				.setDescription(":star:".repeat(result["rank"]))
				.setImage(result["imglink"])
				.setColor("DARK_GREEN")
				.setFooter("August Trading Cards")
			]});
		}
		else {
			message.react("😐");
		}
	}

	// Adds the mentioned user's quote to the database
	else if (message.content.startsWith(`${prefix}quote`) && user_mentioned) {
		// Remove double spaces anywhere.
		let quote = message.content.replace(" ", "").split(" ").slice(1,).join(" ");
		if (quotes_module.add_quote(mongo, mdb_db, mdb_user_quotes, 
			user_mentioned.user.id, quote, message.author.id
		)) {
			message.react("👍");
		}
	}

	// Returns a random quote from the quotes collection given a substring it must have.
	else if (message.content.startsWith(`${prefix}findquote`) && message.content.length > 11)  {
		let substr = message.content.slice(11, message.content.length).toLowerCase();
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) throw err;
			let db = client.db(mdb_db);
			let all_quotes = await db.collection(mdb_user_quotes).find().toArray();
			client.close();
			let matching_quotes = all_quotes.filter((q) => q["quote_text"].toLowerCase().includes(substr));
			// Only send a random quote as a message if any quotes with the given substring exist.
			if (matching_quotes.length > 0) {
				let rquote = matching_quotes[Math.floor(Math.random()*matching_quotes.length)];
				let quotee_display_name = await user_module.get_username(discord_client, message.guild, rquote["quotee"]);
				message.channel.send("*\""+rquote["quote_text"]+"\"* \t- "+quotee_display_name);
			}
			else {
				message.react("😐");
			}
		});
	}
	
	// Match exact, case-insensitive message contents.
	switch (message.content.toLowerCase()) {
		case "hi apple":
			user_module.apple_response(message);
			break;
	
		// Quotes the last message in the current text channel.
		case `${prefix}quotethat`:
			message.channel.messages.fetch({limit : 2}).then((res) => {
				let qmsg = res.array()[1];
				if (quotes_module.add_quote(mongo, mdb_db, mdb_user_quotes, 
					qmsg.author.id, qmsg.content, message.author.id
				)) {
					message.react("👍");
				}
			});
			break;

		// Returns a random quote from the quotes collection.
		case `${prefix}quote`:
		case `${prefix}dq`:
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let all_quotes = await db.collection(mdb_user_quotes).find().toArray();
				client.close();
				// Select a random quote
				let rquote = all_quotes[Math.floor(Math.random()*all_quotes.length)];
				let quotee_display_name = await user_module.get_username(discord_client, message.guild, rquote["quotee"]);
				message.channel.send("*\""+rquote["quote_text"]+"\"* \t- "+quotee_display_name);
			});
			break;

		// Displays the message sender's card collection.
		case `${prefix}mycollection`:
		case `${prefix}mc`:
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let items = await db.collection(mdb_user_collections).find({discord_id : message.author.id}).toArray();
				client.close();
			
				const collection_embed = new MessageEmbed()
					.setTitle(message.author.username + "'s Collection")
					.setColor("DARK_GOLD");
				
				// Display the top leveled (maximum 9) entries.
				collections_module.sort_mycollection(items, "level");
				for (let i = 0; i < 9 && i < items.length; i++) {
					let n = items[i]["card"]["name"] +" +"+ items[i]["card"]["level"];
					let v = ":star:".repeat(items[i]["card"]["rank"]);
					collection_embed.addField(n, v, true);
				}
				collection_embed.setDescription(items.length+" entries total.");
				message.channel.send({embeds:[collection_embed]});
			});
			break;

		// Draw card from august deck and add to sender's collection.
		case `${prefix}drawaugust`:
		case `${prefix}da`:
			if (!recently_drawn.has(message.author.id)) {
				let c = collections_module.pick_drawtrading(cards_trading, weights);
				// For some reason I have to set the level to 0 manually.
				c["level"] = 0;

				message.channel.send({embeds : [
					new MessageEmbed()
					.setTitle(c["name"] + " +" + c["level"])
					.setDescription(":star:".repeat(c["rank"]))
					.setImage(c["imglink"])
					.setColor("DARK_GREEN")
					.setFooter("August Trading Cards")
				]});
				
				collections_module.add_drawtrading(mongo, mdb_db, mdb_user_collections, message.author.id, c);
				collections_module.set_cooldown(message.author.id, recently_drawn, 600000);
			}
			else {
				message.react("⏳");
			}
			break;

		// Draw card from tavern tarot and add to sender's collection.
		case `${prefix}drawtarot`:
		case `${prefix}dt`:
			if (!recently_drawn_tarot.has(message.author.id)) {
				let cards = collections_module.pick_draw3tarot(cards_tarot, message.author.username);
				message.channel.send({embeds: [
					new MessageEmbed()
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
				]});

				collections_module.set_cooldown(message.author.id, recently_drawn_tarot, 14400000);
			}
			else {
				message.react("⏳");
			}
			break;
	}

});  // end of message capture

discord_client.login(process.env.DISCORD_KEY);
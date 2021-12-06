// Discord
const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const discord_client = new Client({intents : [
	Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, 
	Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.GUILD_MESSAGE_REACTIONS
]});

// MongoDB
const mongo = require("mongodb").MongoClient;
const mdb_db = "tavern";
const mdb_user_collections = "user_collections";
const mdb_user_quotes = "user_quotes";

// Gacha decks.
const fs = require("fs");
const cards_trading = JSON.parse(fs.readFileSync("src/resources/cards.json", "utf-8"));
const cards_tarot = JSON.parse(fs.readFileSync("src/resources/tavernarcana.json", "utf-8"));
const card_weights = [0.19, 0.3, 0.4, 0.1, 0.01];
// On initialization, quote weights is populated with uniform probabilities based on number of quotes. 
var quote_weights;

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
	// Populate quote_weights uniformly when program is restarted.
	mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
		if (err) throw err;
		let db = client.db(mdb_db);
		let all_quotes = await db.collection(mdb_user_quotes).find().toArray();
		client.close();
		quote_weights = new Array(all_quotes.length).fill(1/all_quotes.length);
	});
});

// DEVELOPMENT MODE for local testing.
// You can make your own devconf.json with the relevant fields.
if (process.env.NODE_ENV !== "production") {
	console.log("> Development Mode - Auto Start");
	const {dbstr, disckey} = require("./devconf.json");
	process.env.DB_CONNECTION_STRING = dbstr;
	process.env.DISCORD_KEY = disckey;
}


discord_client.on("interactionCreate", async interaction => {
	if (!interaction.isCommand()) return;

	switch (interaction.commandName) {
		case "drawaugust":
			if (recently_drawn.has(interaction.user.id)) {
				await interaction.reply({content: "⏳", ephemeral: true});
				return;
			}

			let c = collections_module.pick_drawtrading(cards_trading, card_weights);
			c["level"] = 0;

			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setCustomId("primary")
						.setLabel("Add to Collection")
						.setStyle("PRIMARY")
				);

			const card = new MessageEmbed()
				.setTitle(c["name"] + " +" + c["level"])
				.setDescription(":star:".repeat(c["rank"]))
				.setImage(c["imglink"])
				.setColor("DARK_GREEN")
				.setFooter("August Trading Cards");
			
			await interaction.reply({embeds : [card], components : [row]});
			
			const filter = i => i.customId === 'primary';
			const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });
			collector.on('collect', async i => {
				if (i.customId === 'primary') {
					collections_module.add_drawtrading(mongo, mdb_db, mdb_user_collections, i.user.id, c);
					await i.update({ content: `Claimed by ${i.user.username}!`, components: [] });
				}
			});
			collections_module.set_cooldown(interaction.user.id, recently_drawn, 600000);
			break;
		
		
		case "drawtarot":
			if (recently_drawn_tarot.has(interaction.user.id)) {
				await interaction.reply({content: "⏳", ephemeral: true});
				return;
			}
			let cards = collections_module.pick_draw3tarot(cards_tarot, interaction.user.username);
			await interaction.reply({embeds: [
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
			collections_module.set_cooldown(interaction.user.id, recently_drawn_tarot, 14400000);
			break;


		case "collection":
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let items = await db.collection(mdb_user_collections).find({discord_id : interaction.user.id}).toArray();
				client.close();
			
				const collection_embed = new MessageEmbed()
					.setTitle(interaction.user.username + "'s Collection")
					.setColor("DARK_GOLD");
				
				// Display the top leveled (maximum 9) entries.
				collections_module.sort_mycollection(items, "level");
				for (let i = 0; i < 9 && i < items.length; i++) {
					let n = items[i]["card"]["name"] +" +"+ items[i]["card"]["level"];
					let v = ":star:".repeat(items[i]["card"]["rank"]);
					collection_embed.addField(n, v, true);
				}
				collection_embed.setDescription(items.length+" entries total.");
				await interaction.reply({embeds:[collection_embed]});
			});
			break;

		
		case "resetcollection":
			// TODO: have it so there's a role-restricted option 
			// for admins to reset another users's collection.
			collections_module.resetmc(mongo, mdb_db, mdb_user_collections, interaction.user);
			await interaction.reply({content: "It is done.", ephemeral: true})
			break;


		case "quote":
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let all_quotes = await db.collection(mdb_user_quotes).find().toArray();
				client.close();
				
				// Select a quote based on the weightings. Reduce its probability, normalize.
				let ind = collections_module.random_index_weighted(quote_weights);
				quote_weights[ind] *= 0.5;
				collections_module.normalize_weights(quote_weights);

				let rquote = all_quotes[ind];
				let quotee_display_name = await user_module.get_username(discord_client, interaction.guild, rquote["quotee"]);
				await interaction.reply({content: `*\"${rquote["quote_text"]}\"* \t- ${quotee_display_name}`});
			});
			break;


		case "addquote":
			let new_quote = interaction.options.getString("quote");
			if (quotes_module.add_quote(mongo, mdb_db, mdb_user_quotes, 
				interaction.options.getMentionable("person").user.id, 
				new_quote, 
				interaction.user.id
			)) {
				interaction.reply({content: `${interaction.user} added a quote to the database.`});
			}
			// Update weightings.
			let avg_weight = quote_weights.reduce((x, y) => x + y) / quote_weights.length;
			quote_weights.push(avg_weight);
			collections_module.normalize_weights(quote_weights);
			break;

		
		case "findquote":
			mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
				if (err) throw err;
				let db = client.db(mdb_db);
				let all_quotes = await db.collection(mdb_user_quotes).find().toArray();
				client.close();
				let matching_quotes = all_quotes.filter(q => (
					q["quote_text"]
						.toLowerCase()
						.includes(interaction.options.getString("text"))
				));
				// Only send a random quote as a message if any quotes with the given substring exist.
				if (matching_quotes.length > 0) {
					let rquote = matching_quotes[Math.floor(Math.random()*matching_quotes.length)];
					let quotee_display_name = await user_module.get_username(discord_client, interaction.guild, rquote["quotee"]);
					await interaction.reply({content: `*\"${rquote["quote_text"]}\"* \t- ${quotee_display_name}`});
				}
				else {
					interaction.reply({content: "😐", ephemeral: true});
				}
			});
			break;
	}
});

discord_client.login(process.env.DISCORD_KEY);
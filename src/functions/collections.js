const { MessageEmbed } = require("discord.js");

module.exports = {
	resetmc : async function (mongo, dbname, dbcollection, target) {
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) throw err;
			let db = client.db(dbname);
			await db.collection(dbcollection).deleteMany({discord_id : target.id});
			client.close();
		});
	},

	sort_mycollection : function (items, attr) {
		// Select sort displayed cards in desc order
		let i, j;
		for (i = 0; i < items.length; i++) {
			for (j = i+1; j < items.length; j++) {
				if (items[j]["card"][attr] > items[i]["card"][attr]) {
					[items[i], items[j]] = [items[j], items[i]];
				}
			}
		}
	},

	pick_drawtrading : function (cards, weights) {
		// Pick a random ranking based on weights (+1 because this returns an index).
		let rand_rank = this.random_index_weighted(weights) + 1;
		// Get a random card with this rank.
		let selected_cards = cards.filter((c) => c["rank"] === rand_rank);
		return selected_cards[Math.floor(Math.random() * selected_cards.length)];
	},

	add_drawtrading : async function (mongo, dbname, dbcollection, target, c) {
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) throw err;
			let db = client.db(dbname);

			// See how many copies of this card WITH THIS LEVEL already exist.
			let count = await db.collection(dbcollection).countDocuments({discord_id : target, card : c});
			while (count > 0) {
				// Delete the duplicates.
				for (let i = 0; i < count; i++) {
					await db.collection(dbcollection).deleteOne({discord_id : target, card : c});
				}
				// Increment the level of this card.
				c["level"]++;
				// See if we have any more cards of this new level to consolidate.
				count = await db.collection(dbcollection).countDocuments({discord_id : target, card : c});
			}
			// Add the card.
			await db.collection(dbcollection).insertOne({discord_id : target, card : c});
			client.close();
		});
	},

	pick_draw3tarot : function (t_cards, target) {
		let selected_cards = [];
		// Get three unique cards
		//  - first one is primary
		//  - second is its reverse, or warning
		//  - third is some more advice
		while (selected_cards.length < 3) {
			let c;
			do {
				c = t_cards[Math.floor(Math.random() * t_cards.length)];
			} while (c["imglink"] == "" || selected_cards.includes(c));
			selected_cards.push(c);
		}
		// For lucky primary draws on The World. Yes, this is a JoJo reference!
		if (selected_cards[0]["id"] === 21) {
			selected_cards[0]["description"] = "I, "+target+", have a dream!";
		}
		return selected_cards;
	},

	// Normalize probabilities to add to 1.0.
	normalize_weights : function (weights) {
		let weights_total = weights.reduce((x, y) => x + y);
		for (let i = 0; i < weights.length; i++) {
			weights[i] /= weights_total;
		}
	},

	// Random index based on given weights.
	// Based on this Python implementation: https://stackoverflow.com/a/10803136.
	random_index_weighted : function (weights) {
		let r = Math.random();
		let cumul_sum = new Array(weights.length);
		for (let i = 1; i < cumul_sum.length; i++) {
			cumul_sum[i] = weights.slice(0, i).reduce((x, y) => x + y);
		}
		for (let i = 0; i < cumul_sum.length; i++) {
			if (cumul_sum[i] > r) return i;
		}
		return 0;
	},

	// User cannot draw from this deck again for some time
	set_cooldown : function (target, cooldown_set, timeout) {
		cooldown_set.add(target);
		setTimeout(() => {
			cooldown_set.delete(target);
		}, timeout);
	},

	// Returns an embed for a card collection page.
	generate_page_embed : async function (data, start) {
		const page = new MessageEmbed()
			.setTitle("Card Collection")
			.setColor("DARK_GOLD");
		
		for (let i = start; i < start+9 && i < data.length; i++) {
			let n = data[i]["card"]["name"] +" +"+ data[i]["card"]["level"];
			let v = ":star:".repeat(data[i]["card"]["rank"]);
			page.addField(n, v, true);
		}
		page.setDescription(data.length+" entries total.");
		return page;
	}
}
module.exports = {
	resetmc : async function (mongo, dbname, dbcollection, target, message) {
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) throw err;
			let db = client.db(dbname);
			await db.collection(dbcollection).deleteMany({discord_id : target.id});
			client.close();
		});
		message.channel.send("Collection reset for "+target.username+".");
	},

	describecard : function (target, cards_trading, cards_tarot) {
		let tarot_result = cards_tarot.find((c) => c["name"].toLowerCase() == target);
		let trading_result = cards_trading.find((c) => c["name"].toLowerCase() == target);
		if (tarot_result) return tarot_result;
		else if (trading_result) return trading_result;
		else return {"deck":"none"};
	},

	sort_mycollection : function (items) {
		// Select sort displayed cards in desc order
		let i, j;
		for (i = 0; i < items.length; i++) {
			for (j = i+1; j < items.length; j++) {
				if (items[j]["card"]["rank"] > items[i]["card"]["rank"]) {
					[items[i], items[j]] = [items[j], items[i]];
				}
			}
		}
	},

	pick_drawtrading : function (cards, weights) {
		// Pick a random ranking
		let rand_rank = weights[Math.floor(Math.random()*weights.length)];
		// Get a random card with rank LEQ the random rank
		let selected_cards = cards.filter((c) => c["rank"] <= rand_rank);
		return selected_cards[Math.floor(Math.random() * selected_cards.length)];
	},

	add_drawtrading : async function (mongo, dbname, dbcollection, target, c) {
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) throw err;
			let db = client.db(dbname);
			// If drawn card in user collection, increment the card's level and replace it with the incremented card
			let card_exists = await db.collection(dbcollection).findOne({discord_id : target, card : c});
			if (card_exists) {
				await db.collection(dbcollection).deleteOne({discord_id : target, card : c});
				c["level"]++;
			}
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

	// User cannot draw from this deck again for some time
	set_cooldown : function (target, cooldown_set, timeout) {
		cooldown_set.add(target);
		setTimeout(() => {
			cooldown_set.delete(target);
		}, timeout);
	}
}
module.exports = {
	add_quote : async function (mongo, dbname, dbcollection, target, q, sender) {
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) return false;
			let db = client.db(dbname);
			// Don't add the same quote twice.
			let quote_exists = await db.collection(dbcollection).findOne({quotee : target, quote_text : q});
			if (!quote_exists) {
				await db.collection(dbcollection).insertOne({
					quotee : target, 
					quote_text : q, 
					added_by : sender
				});
			}
			client.close();
			return true;
		});
	},

	remove_quotes : async function(mongo, dbname, dbcollection, substr) {
		mongo.connect(process.env.DB_CONNECTION_STRING, {useUnifiedTopology: true}, async function(err, client) {
			if (err) return false;
			let db = client.db(dbname);
			// There is definitely a cleaner way of doing this with regex, but I couldn't get it to work this time.
			let all_quotes = await db.collection(dbcollection).find().toArray();
			let matching_quotes = all_quotes.filter((q) => q["quote_text"].toLowerCase().includes(substr));
			// Yeah, let's NOT drop the whole database.
			if (matching_quotes.length > 5) {
				client.close();
				return false;
			}
			// Removes all the quotes that match the target substring.
			for (const q of matching_quotes) {
				await db.collection(dbcollection).deleteOne({
					quotee : q["quotee"],
					quote_text : q["quote_text"]
				});
			}
			client.close();
			return true;
		});
	}
}
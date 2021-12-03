module.exports = {
	apple_response : function (message) {
		let day = new Date;
		// We take away 8 or 7 here because Heroku uses UTC, so this gets us PST without messing with Heroku.
		let hour_of_day = day.getHours() - 7;
		if (hour_of_day < 0) hour_of_day = 24 + hour_of_day;

		if (hour_of_day > 17)  {
			message.channel.send("Good evening, "+message.author.username+". :apple:");
		}
		else if (hour_of_day > 12)  {
			message.channel.send("Good afternoon, "+message.author.username+"! :apple:");
		}
		else  {
			message.channel.send("Good morning, "+message.author.username+"! :apple:");
		}	
	},

	get_username : async function (dclient, dguild, target_id) {
		let quotee_user = await dclient.users.fetch(target_id);
		let quotee_guild_user = await dguild.members.cache.get(target_id);
		// If the quotee is in the current guild (server), we take return their nickname.
		// Otherwise, we just make use of their current global Discord username.
		if (quotee_guild_user && quotee_guild_user.nickname) return quotee_guild_user.nickname;
		else return quotee_user.username;
	}
}
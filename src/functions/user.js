module.exports = {
	apple_response : function (message) {
		let day = new Date;
		// We take away 8 here because Heroku uses UTC, so this gets us PST without messing with Heroku.
		let hour_of_day = day.getHours() - 8;
		console.log(hour_of_day);
		if (hour_of_day > 17)
			message.channel.send("Good evening, "+message.author.username+". :apple:");
		else if (hour_of_day > 12)
			message.channel.send("Good afternoon, "+message.author.username+"! :apple:");
		else
			message.channel.send("Good morning, "+message.author.username+"! :apple:");
	}
}
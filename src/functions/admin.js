module.exports = {
	kick : async function (member, message) {
		await member.kick();
		message.channel.send(member.displayName+" got the boot!"+" :boot:");
	},

	ban : async function (member, message) {
		await member.ban();
		message.channel.send(member.displayName+" got MC Hammer'd!"+" :hammer:");
	},

	purge : function (count, message) {
		let targets = Number(count);
		if (targets > 0 && targets < 51) {
			message.channel.bulkDelete(targets + 1);
			message.channel.send(targets+" message(s) deleted.");
		}
		else {
			message.channel.send(targets+" is an invalid quantity.")
		}
	},

	resetcd : function (member, cooldown_sets, message) {
		for (const set of cooldown_sets) {
			set.delete(member.user.id);
		}
		message.channel.send("Reset all draw timers for "+member.user.username+".");
	}
}
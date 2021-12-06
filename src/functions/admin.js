module.exports = {
	kick : async function (member, message) {
		await member.kick();
		message.channel.send(member.displayName+" got the boot!");
	},

	ban : async function (member, message) {
		await member.ban();
		message.channel.send(member.displayName+" got MC Hammer'd!");
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

	resetcd : function (uid, cooldown_sets) {
		for (const set of cooldown_sets) {
			set.delete(uid);
		}
	}
}
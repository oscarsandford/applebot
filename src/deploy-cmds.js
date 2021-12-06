const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { disckey, testGuildId, appleClientId } = require('./devconf.json');

const commands = [
	{
		'name' : 'drawaugust',
		'description' : 'Draw an August card.'
	},
	{
		'name' : 'drawtarot',
		'description' : 'Draw a Tavern Tarot card.'
	},
	{
		'name' : 'collection',
		'description' : 'Check out the cards you\'ve claimed.'
	},
	{
		'name' : 'resetcollection',
		'description' : 'Reset your card collection. No undo!'
	},
	{
		'name' : 'quote',
		'description' : 'Have Apple say a random quote.',
	},
	{
		'name' : 'addquote',
		'description' : 'Write a person\'s quote to the database.',
		'options' : [
			{
				'name' : 'person',
				'description' : 'The person who said the thing.',
				'type' : 9,
				'required' : true
			},
			{
				'name' : 'quote',
				'description' : 'Their sussy statement.',
				'type' : 3,
				'required' : true
			}
		]
	},
	{
		'name' : 'findquote',
		'description' : 'Find any quote matching the given text.',
		'options' : [
			{
				'name' : 'text',
				'description' : 'A substring of the quote.',
				'type' : 3,
				'required' : true
			},
		]
	}
	// {
	// 	'name' : 'quotethat',
	// 	'description' : 'Quote the last thing said.',
	// 	'options' : [
	// 		{
	// 			'name' : 'person',
	// 			'description' : '[WIP] Quote the last thing this person said in this channel.',
	// 			'type' : 9,
	// 			'required' : false
	// 		},
	// 	]
	// }
]

const rest = new REST({ version: '9' }).setToken(disckey);

// LOCAL: slash command changes for test server only. Faster for development.
// rest.put(Routes.applicationGuildCommands(appleClientId, testGuildId), { body: commands })
// 	.then(() => console.log('[Apple] Successfully registered application commands LOCALLY.'))
// 	.catch(console.error);

// GLOBAL: propogate slash command changes globally.
rest.put(Routes.applicationCommands(appleClientId), { body: commands })
	.then(() => console.log('[Apple] Successfully registered application commands GLOBALLY.'))
	.catch(console.error);

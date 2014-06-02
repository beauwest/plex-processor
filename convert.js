#!/usr/bin/env node
'use strict';

var prompt = require('prompt'),
	fs = require('fs'),
	path = require('path-extra');

var configPath = path.join(path.homedir(), ".plex-processor.json");

// Check to see if we can get the config file.
fs.exists(configPath, function (exists) {
	var configuration = {};
	if (exists) {
		try {
			configuration = JSON.parse(fs.readFileSync(configPath));
		} catch (exception) {
			configuration = {};
		}
	}

	if (exists && configuration) {
		prompt.start();
		prompt.get({
			properties: {
				'convert': {
					description: 'Type to convert [movie | tv]',
					default: 'movie',
					required: true,
					pattern: /^(movie|tv)$/,
					message: 'Please enter a valid type.'
				}
			}
		}, function (err, result) {
			if (result) {
				var convert = require('./lib/' + result.convert);
				convert.run(configuration);
			}
		});

	} else {
		prompt.start();
		prompt.get({
			properties: {
				'preset': {
					description: 'Choose a Handbrake preset',
					required: true,
					default: 'AppleTV 3'
				},
				'movie_input': {
					description: 'Path to movie input directory',
					required: true,
					message: 'Please enter a valid directory.',
					conform: function (value) {
						if (fs.existsSync(value)) {
							return true;
						}
						return false;
					}
				},
				'movie_output': {
					description: 'Path to movie output directory',
					required: true,
					message: 'Please enter a valid directory.',
					conform: function (value) {
						if (fs.existsSync(value)) {
							return true;
						}
						return false;
					}
				},
				'tv_input': {
					description: 'Path to TV shows input directory',
					required: true,
					message: 'Please enter a valid directory.',
					conform: function (value) {
						if (fs.existsSync(value)) {
							return true;
						}
						return false;
					}
				},
				'tv_output': {
					description: 'Path to TV shows output directory',
					required: true,
					message: 'Please enter a valid directory.',
					conform: function (value) {
						if (fs.existsSync(value)) {
							return true;
						}
						return false;
					}
				},
				'archive': {
					description: 'Path to archive directory',
					required: true,
					message: 'Please enter a valid directory.',
					conform: function (value) {
						if (fs.existsSync(value)) {
							return true;
						}
						return false;
					}
				}
			}
		}, function (err, result) {
			if (result) {
				fs.writeFile(configPath, JSON.stringify(result, null, "\t"), function () {
					console.log('Configuration saved. Please restart.');
					process.exit();
				});
			}
		});
	}
});
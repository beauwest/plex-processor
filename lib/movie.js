'use strict';

var fs = require('fs'),
	path = require('path'),
	prompt = require('prompt'),
	handbrake = require('handbrake-js'),
	configurationObject = {},
	processList = [];

module.exports = {
	run: function (configuration) {
		configurationObject = configuration;

		fs.readdir(configurationObject.movie_input, function (error, files) {

			console.log('\nFile list:');
			files.forEach(function (file, index) {
				console.log((index + 1) + ': ' + file);
			});

			prompt.start();
			prompt.get({
				properties: {
					'convertSelection': {
						description: 'Convert one, or all?',
						default: '*',
						required: true,
						pattern: /^(\*|[0-9]+)$/,
						message: 'Please enter a selection.'
					}
				}
			}, function (err, result) {
				if (result) {
					if (result.convertSelection === '*') {
						processList = files;
					} else {
						processList = [files[result.convertSelection - 1]];
					}

					// Begin the processing.
					processMovies();
				}
			});
		});
	}
};

function processMovies() {
	if (processList.length > 0) {
		var nextMovie = processList.shift();
		process(nextMovie);
	} else {
		console.log('\nComplete! Thank you!\n');
	}
}

function process(movie) {
	console.log('\n[' + movie + '] Starting to process.');
	handbrake.spawn({
		'input': path.resolve(path.normalize(configurationObject.movie_input + '/' + movie)),
		'output': path.resolve(path.normalize(configurationObject.movie_output + '/' + path.basename(movie, path.extname(movie)) + '.m4v')),
		'preset': configurationObject.preset,
		'main-feature': true,
		'large-file': true
	}).on('error',function (error) {
		throw error;
	}).on('output',function (output) {
		//console.log(output);
	}).on('progress',function (progress) {
		console.log('[' + movie + '] ' + progress.task + ': ' + progress.percentComplete + '%' + (progress.eta ? ' - ETA: ' + progress.eta : ''));
	}).on('complete', function () {

		// Move to the archive directory
		fs.rename(path.resolve(path.normalize(configurationObject.movie_input + '/' + movie)), path.resolve(path.normalize(configurationObject.archive + '/' + movie)), function () {
			processMovies();
		});
	});
}
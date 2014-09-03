'use strict';

var fs = require('fs'),
	path = require('path'),
	prompt = require('prompt'),
	handbrake = require('handbrake-js'),
	mv = require('mv'),
	request = require('request'),
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

function fetchMovieName(movie, callback) {
	request({
		method: 'GET',
		url: 'http://api.themoviedb.org/3/search/movie?api_key=6d85b54de8e4fa86cf1652c44cace964&query=' + encodeURIComponent(movie),
		headers: {
			'Accept': 'application/json'
		}}, function (error, response, body) {
		if (error) {
			callback(movie);
		} else {
			body = JSON.parse(body);
			if (body && body.results && body.results[0]) {
				var details = body.results[0];

				// Replace special OS characters.
				var special = new Array('<', '>', ':', '/', '\\', '|', '?', '*');
				for (var i = 0; i < special.length; i++) {
					details.original_title = details.original_title.replace(special[i], '');
				}

				details.release_date = (details.release_date ? new Date(details.release_date) : null);
				callback(details.original_title + ' (' + details.release_date.getUTCFullYear() + ') ');
			} else {
				callback(movie);
			}
		}
	});
}

function process(movie) {
	console.log('\n[' + movie + '] Starting to process.');

	// Fetch the output file name.
	var formattedMovieName = path.basename(movie, path.extname(movie));
	fetchMovieName(formattedMovieName, function (outputName) {
		console.log('\n[' + movie + '] Fetched movie name: ' + outputName);
		if (!outputName) {
			outputName = formattedMovieName;
		}
		handbrake.spawn({
			'input': path.resolve(path.normalize(configurationObject.movie_input + '/' + movie)),
			'output': path.resolve(path.normalize(configurationObject.movie_output + '/' + outputName + '.m4v')),
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
			var fromPath = path.resolve(path.normalize(configurationObject.movie_input + '/' + movie)),
				toPath = path.resolve(path.normalize(configurationObject.archive + '/' + movie));
			console.log('Moving' + fromPath + ' -> ' + toPath);
			mv(fromPath, toPath, {'mkdirp': true}, function (error) {
				if (error) {
					throw error;
				}
				processMovies();
			});
		});
	});
}
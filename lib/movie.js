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
		
			buildMovieList(files, function(formattedFiles) {
				console.log('\nFile list:');
				formattedFiles.forEach(function (file, index) {
					console.log((index + 1) + ': ' + file.formatted);
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
							processList = formattedFiles;
						} else {
							processList = [formattedFiles[result.convertSelection - 1]];
						}

						// Begin the processing.
						processMovies();
					}
				});
			});
		});
	}
};

function buildMovieList(files, callback) {
	var formattedFiles = [];
	(function next(index) {
		if (index === files.length) {
			callback(formattedFiles);
		}
		if(files[index]) {
			fetchMovieName(files[index], function (outputName) {
				formattedFiles.push({'filename': files[index], 'formatted': outputName});
				next(index + 1);
			});
		}
	})(0);
}

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
				callback(details.original_title + ' (' + details.release_date.getUTCFullYear() + ')');
			} else {
				callback(movie);
			}
		}
	});
}

function process(movie) {
	console.log('\n[' + movie.formatted + '] Starting to process.');

	handbrake.spawn({
		'input': path.resolve(path.normalize(configurationObject.movie_input + '/' + movie.filename)),
		'output': path.resolve(path.normalize(configurationObject.movie_output + '/' + movie.formatted + '.m4v')),
		'preset': configurationObject.preset,
		'main-feature': true,
		'large-file': true
	}).on('error',function (error) {
		throw error;
	}).on('output',function (output) {
		//console.log(output);
	}).on('progress',function (progress) {
		console.log('[' + movie.formatted + '] ' + progress.task + ': ' + progress.percentComplete + '%' + (progress.eta ? ' - ETA: ' + progress.eta : ''));
	}).on('complete', function () {

		// Move to the archive directory
		var fromPath = path.resolve(path.normalize(configurationObject.movie_input + '/' + movie.filename)),
			toPath = path.resolve(path.normalize(configurationObject.archive + '/' + movie.filename));
		console.log('Moving' + fromPath + ' -> ' + toPath);
		mv(fromPath, toPath, {'mkdirp': true}, function (error) {
			if (error) {
				throw error;
			}
			processMovies();
		});
	});
}
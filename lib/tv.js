'use strict';

var fs = require('fs'),
	path = require('path'),
	prompt = require('prompt'),
	handbrake = require('handbrake-js'),
	mv = require('mv'),
	configurationObject = {},
	processList = [];

module.exports = {
	run: function (configuration) {
		configurationObject = configuration;

		fs.readdir(configurationObject.tv_input, function (error, files) {
			files.sort();

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
					processTVShows();
				}
			});
		});
	}
};

function processTVShows() {
	if (processList.length > 0) {
		var dvd = processList.shift();
		buildDVDInformation(dvd, function (titleList) {
			processTitles(dvd, titleList);
		})
	} else {
		console.log('\nComplete! Thank you!\n');
	}
}

function buildDVDInformation(dvd, callback) {
	dvd = path.resolve(path.normalize(configurationObject.tv_input + '/' + dvd));

	// Check if it's a single ISO, otherwise, assume it's a list of files.
	fs.stat(dvd, function (err, stats) {
		if (stats.isDirectory()) {
			var fileList = fs.readdirSync(dvd),
				isDVD = false;
			for (var i = 0; i < fileList.length; i++) {
				var stat = fs.statSync(path.join(dvd, fileList[i]));
				if (stat.isDirectory()) {
					isDVD = true;
				}
			}
			if (isDVD) {
				buildDVDInformationFromHandbrake(dvd, function (handbrakeTitleList) {
					callback(handbrakeTitleList);
				});
			} else {
				var titlePathsList = [];
				fileList.forEach(function (item) {
					titlePathsList.push({path: path.join(dvd, item), title: 1});
				});
				callback(titlePathsList);
			}
		} else {
			buildDVDInformationFromHandbrake(dvd, function (handbrakeTitleList) {
				callback(handbrakeTitleList);
			});
		}
	});
}

function buildDVDInformationFromHandbrake(dvd, callback) {
	handbrake.exec({
		'input': dvd,
		'previews': '0:0',
		'title': '0'
	}, function (error, stdout, stderr) {
		if (error) {
			throw error;
		}

		var titleList = [],
			lines = stderr.split('\n'),
			workingTitle = 0;
		lines.forEach(function (line) {
			var titleMatch = line.match(/scan: scanning title ([0-9]+)/i),
				durationMatch = line.match(/scan: duration is ([0-9]{2}):([0-9]{2}):([0-9]{2})/i);
			if (titleMatch) {
				workingTitle = titleMatch[1];
			}
			if (workingTitle && durationMatch) {
				titleList.push({
					'title': parseInt(workingTitle, 10),
					'duration': (parseInt(durationMatch[1], 10) * 3600) + (parseInt(durationMatch[2], 10) * 60) + (parseInt(durationMatch[3], 10))
				});
				workingTitle = 0;
			}
		});
		callback(titleList);
	});
}

function processTitles(dvd, titles) {
	if (titles.length > 0) {
		var workingTitle = titles.shift();

		if (workingTitle.duration) {
			console.log('Beginning on title #' + workingTitle.title + ' - ' + workingTitle.duration + ' seconds');
		} else {
			console.log('Beginning on ' + workingTitle.path);
		}

		processSingleEpisode(dvd, workingTitle, function () {
			processTitles(dvd, titles);
		});
	} else {
		var fromPath = path.resolve(path.normalize(configurationObject.tv_input + '/' + dvd)),
			toPath = path.resolve(path.normalize(configurationObject.archive + '/' + dvd));
		console.log('Moving' + fromPath + ' -> ' + toPath);
		mv(fromPath, toPath, {'mkdirp': true}, function (error) {
			if (error) {
				throw error;
			}
			processTVShows();
		});
	}
}

function processSingleEpisode(dvd, title, callback) {
	if (title.duration && title.duration < 600 || title.duration > 5400) {
		console.log('\n[' + dvd + '] [title ' + title.title + '] Skipping... ' + title.duration + ' seconds long.');
		callback();
	} else {
		var nameMatches = path.basename(dvd, path.extname(dvd)).match(/^(.*) ([0-9]{1,2})([0-9]{2})$/);

		var show = nameMatches[1].trim(),
			season = pad(nameMatches[2], 2, '0', STR_PAD_LEFT),
			episode = pad('1', 2, '0', STR_PAD_LEFT),
			seasonFolder = path.resolve(path.normalize(configurationObject.tv_output + '/' + show + '/Season ' + parseInt(season, 10)));

		fs.readdir(seasonFolder, function (error, files) {
			if (error) {
				mkdirPSync(seasonFolder);
			}
			if (files && files.length > 0) {
				files.sort();
				var lastEpisode = files.pop(),
					episodeMatches = path.basename(lastEpisode, path.extname(lastEpisode)).match(/([0-9]{2}$)/),
					lastEpisode = parseInt(episodeMatches[1]);
				episode = pad((lastEpisode + 1).toString(), 2, '0', STR_PAD_LEFT);
			}

			// Spawn the handbrake processing.
			console.log('\n[' + show + '] [S' + season + 'E' + episode + '] Starting to process.');
			handbrake.spawn({
				'input': (title.path ? title.path : path.resolve(path.normalize(configurationObject.tv_input + '/' + dvd))),
				'output': path.resolve(path.normalize(seasonFolder + '/' + show + ' S' + season + 'E' + episode + '.m4v')),
				'preset': configurationObject.preset,
				'title': title.title,
				'large-file': true
			}).on('error',function (error) {
				throw error;
			}).on('output',function (output) {
				//console.log(output);
			}).on('progress',function (progress) {
				console.log('[' + show + '] [S' + season + 'E' + episode + '] ' + progress.task + ': ' + progress.percentComplete + '%' + (progress.eta ? ' - ETA: ' + progress.eta : ''));
			}).on('complete', function () {
				callback();
			});
		});
	}
}

// String padding function
var STR_PAD_LEFT = 1;
var STR_PAD_RIGHT = 2;
var STR_PAD_BOTH = 3;
function pad(str, len, padString, dir) {
	if (typeof(len) === "undefined") {
		len = 0;
	}
	if (typeof(padString) === "undefined") {
		padString = ' ';
	}
	if (typeof(dir) === "undefined") {
		dir = STR_PAD_RIGHT;
	}
	if (len + 1 >= str.length) {
		switch (dir) {
			case STR_PAD_LEFT:
				str = new Array(len + 1 - str.length).join(padString) + str;
				break;

			case STR_PAD_BOTH:
				var padlen = 0;
				var right = Math.ceil((padlen = len - str.length) / 2);
				var left = padlen - right;
				str = new Array(left + 1).join(padString) + str + new Array(right + 1).join(padString);
				break;

			default:
				str = str + new Array(len + 1 - str.length).join(padString);
				break;
		}
	}
	return str;
}

function mkdirPSync(p, mode, made) {
	if (mode === undefined) {
		mode = '0777';
	}
	if (!made) {
		made = null;
	}
	if (typeof mode === 'string') {
		mode = parseInt(mode, 8);
	}
	p = path.resolve(p);

	try {
		fs.mkdirSync(p, mode);
		made = made || p;
	}
	catch (err0) {
		switch (err0.code) {
			case 'ENOENT' :
				made = mkdirPSync(path.dirname(p), mode, made);
				mkdirPSync(p, mode, made);
				break;
			default:
				var stat;
				try {
					stat = fs.statSync(p);
				}
				catch (err1) {
					throw err0;
				}
				if (!stat.isDirectory()) {
					throw err0;
				}
				break;
		}
	}
	return made;
}
plex-processor
============
Plex Processor is an simple, cross-platform method of converting DVD images, or any kind of movie files to Plex compatable files. The conversion process uses Handbrake to transcode the files.

### Movies
The script uses the Handbrake `--main-feature` setting to automatically detect the primary title on the DVD image.

### TV Shows
Tracks on DVD images that are within the duration parameters will be converted in order that they appear on the DVD and named in sequential episode numbers.

Command line use
================
Install
-------
Install [Node.js](http://nodejs.org), then run

```sh
$ npm install
```

Usage
-----
Call `node convert` from the command line.
```sh
$ node convert
```
On the first run, you will be prompted to set up your configuration.

Configuration
-------------

* preset: Choose from the [list of Handbrake presets](https://trac.handbrake.fr/wiki/BuiltInPresets).
* movie_input: Path to the movie input directory.
* movie_ouput: Path to the movie output directory.
* tv_input: Path to the TV input directory.
* tv_ouput: Path to the TV output directory.
* archive: Path to place the completed files into.
